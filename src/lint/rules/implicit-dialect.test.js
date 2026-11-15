import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse, Hyperjump } from "@hyperjump/browser";
import { jsonSchemaConfig } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { draft07Dialect } from "../../dialects/draft-07/index.js";
import { draft202012Dialect } from "../../dialects/draft-2020-12/index.js";
import { linter } from "../test-linter.js";
import implicitDialect from "./implicit-dialect.js";
import { lint as lintSchema } from "../../operations/lint.js";

const draft07 = "http://json-schema.org/draft-07/schema";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

describe("implicit-dialect", () => {
  test("a dialect from the default", async () => {
    const file = await lint(`{ "type": "string" }`, { defaultDialectUri: draft202012 });
    expect(file.messages.map((message) => message.reason)).to.eql([
      `The schema doesn't declare its dialect, so it's '${draft202012}' only because of how it was loaded. Add '"$schema": "${draft202012}"' so other tools read it the same way.`
    ]);
    expect(file.messages[0].ruleId).to.equal("implicit-dialect");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 21, offset: 20 }
    });
  });

  test("a dialect from the dialectUri option", async () => {
    const file = await lint(`{ "type": "string" }`, { dialectUri: draft07 });
    expect(file.messages.map((message) => message.reason)).to.eql([
      `The schema doesn't declare its dialect, so it's '${draft07}#' only because of how it was loaded. Add '"$schema": "${draft07}#"' so other tools read it the same way.`
    ]);
  });

  test("with $schema", async () => {
    const file = await lint(`{ "$schema": "${draft07}#", "type": "string" }`, { defaultDialectUri: draft202012 });
    expect(file.messages).to.eql([]);
  });

  // The resolver doesn't give a document whose root is a reference a dialect
  test("a draft-07 reference without $schema isn't reported", async () => {
    const file = await lint(`{ "$ref": "#/definitions/foo", "definitions": { "foo": {} } }`, { dialectUri: draft07 });
    expect(file.messages.filter((message) => message.ruleId === "implicit-dialect")).to.eql([]);
  });

  test("an embedded resource without $schema", async () => {
    const file = await lint(`{
      "$schema": "${draft202012}",
      "$defs": {
        "foo": { "$id": "https://example.com/foo" }
      }
    }`, {});
    expect(file.messages).to.eql([]);
  });

  test("a boolean schema", async () => {
    const file = await lint(`true`, { defaultDialectUri: draft202012 });
    expect(file.messages).to.eql([]);
  });

  test("no dialect is the resolver's error", async () => {
    const file = await lint(`{ "type": "string" }`, {});
    expect(file.messages.map((message) => message.ruleId)).to.eql(["missing-dialect"]);
  });

  test("the CLI has no default dialect", async () => {
    const file = new VFile({ path: "/schemas/a.schema.json", value: `{ "type": "string" }` });
    await linter()
      .use(implicitDialect)
      .process(file);
    expect(file.messages.map((message) => message.ruleId)).to.eql(["missing-dialect"]);
  });

  // The CLI never reports it, so these are how it's used
  describe("linting from code", () => {
    test("a registry entry's dialectUri", async () => {
      const jsonSchema = jsonSchemaConfig({
        dialects: [draft202012Dialect],
        registry: new SchemaRegistry([{
          schema: `{ "type": "string" }`,
          retrievalUri: "https://example.com/a",
          dialectUri: draft202012
        }])
      });
      const results = await lintSchema(jsonSchema, "https://example.com/a", { plugins: [implicitDialect] });

      expect(results.map((result) => result.ruleId)).to.eql(["implicit-dialect"]);
    });

    test("the default dialect", async () => {
      const jsonSchema = jsonSchemaConfig({
        defaultDialectUri: draft202012,
        dialects: [draft202012Dialect],
        registry: new SchemaRegistry([{
          schema: `{ "type": "string" }`,
          retrievalUri: "https://example.com/a"
        }])
      });
      const results = await lintSchema(jsonSchema, "https://example.com/a", { plugins: [implicitDialect] });

      expect(results.map((result) => result.ruleId)).to.eql(["implicit-dialect"]);
    });
  });
});

/** @type (json: string, options: { dialectUri?: string; defaultDialectUri?: string }) => Promise<VFile> */
const lint = async (json, { dialectUri, defaultDialectUri }) => {
  const jsonSchema = jsonSchemaConfig({
    defaultDialectUri,
    dialects: [draft07Dialect, draft202012Dialect]
  });

  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session: new Hyperjump(jsonSchema), dialectUri })
    .use(implicitDialect);
  await processor.run(processor.parse(file), file);
  return file;
};
