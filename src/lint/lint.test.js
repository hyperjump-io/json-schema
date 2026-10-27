import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { addV1, v1DialectUri } from "../dialects/v1/index.js";
import recommended from "./recommended.js";
import thenElseWithoutIf from "./rules/then-else-without-if.js";
import referenceWithoutTarget from "./rules/reference-without-target.js";

const a = `{
  "$schema": "${v1DialectUri}",
  "$id": "https://example.com/a",
  "then": { "type": "string" }
}`;

describe("lint", () => {
  test("results are plain data", async () => {
    expect(await jsonSchemaWith(a).lint("https://example.com/a", { plugins: [thenElseWithoutIf] })).to.eql([{
      source: "json-schema-lint",
      ruleId: "then-else-without-if",
      severity: "warn",
      uri: "https://example.com/a",
      place: { start: { line: 4, column: 3, offset: 81 }, end: { line: 4, column: 31, offset: 109 } },
      message: "'then' has no effect without 'if'",
      url: "https://hyperjump.io/json-schema/linting/rules/then-else-without-if/"
    }]);
  });

  test("the recommended preset by default", async () => {
    const results = await jsonSchemaWith(a).lint("https://example.com/a");

    expect(results.map((result) => result.ruleId)).to.eql(["then-else-without-if"]);
  });

  test("a preset with a rule adjusted after it", async () => {
    const results = await jsonSchemaWith(a).lint("https://example.com/a", {
      plugins: [recommended, [thenElseWithoutIf, ["error"]]]
    });

    expect(results.map((result) => [result.ruleId, result.severity])).to.eql([["then-else-without-if", "error"]]);
  });

  test("a rule that's off", async () => {
    const results = await jsonSchemaWith(a).lint("https://example.com/a", {
      plugins: [recommended, [thenElseWithoutIf, ["off"]]]
    });

    expect(results).to.eql([]);
  });

  test("the whole document, including definitions nothing references", async () => {
    const results = await jsonSchemaWith(`{
      "$schema": "${v1DialectUri}",
      "$id": "https://example.com/main",
      "$defs": { "unused": { "then": { "type": "string" } } }
    }`).lint("https://example.com/main", { plugins: [thenElseWithoutIf] });

    expect(results).to.have.length(1);
  });

  test("the whole document, whatever the fragment", async () => {
    const results = await jsonSchemaWith(`{
      "$schema": "${v1DialectUri}",
      "$id": "https://example.com/main",
      "then": { "type": "string" },
      "$defs": { "foo": { "else": true } }
    }`).lint("https://example.com/main#/$defs/foo", { plugins: [thenElseWithoutIf] });

    expect(results).to.have.length(2);
  });

  test("a document it references isn't linted, but rules can see it", async () => {
    const results = await jsonSchemaWith(`{
      "$schema": "${v1DialectUri}",
      "$id": "https://example.com/main",
      "properties": {
        "foo": { "$ref": "other" },
        "bar": { "$ref": "other#/$defs/missing" }
      }
    }`, `{
      "$schema": "${v1DialectUri}",
      "$id": "https://example.com/other",
      "then": { "type": "string" }
    }`).lint("https://example.com/main", { plugins: [thenElseWithoutIf, referenceWithoutTarget] });

    expect(results.map((result) => [result.uri, result.ruleId])).to.eql([
      ["https://example.com/main", "reference-without-target"]
    ]);
  });

  test("configuration comments apply", async () => {
    const results = await jsonSchemaWith(`{
      "$schema": "${v1DialectUri}",
      "$id": "https://example.com/main",
      "$comment": "json-schema-lint-disable then-else-without-if",
      "then": { "type": "string" }
    }`).lint("https://example.com/main", { plugins: [thenElseWithoutIf] });

    expect(results).to.eql([]);
  });

  test("a document's schema problems are returned, not thrown", async () => {
    const results = await jsonSchemaWith(`{
      "$schema": "${v1DialectUri}",
      "$id": "https://example.com/bad",
      "minLength": -1
    }`).lint("https://example.com/bad");

    expect(results).toMatchObject([{
      source: "json-schema",
      ruleId: "https://json-schema.org/keyword/minLength",
      severity: "error",
      uri: "https://example.com/bad"
    }]);
  });

  test("in a session", async () => {
    const session = jsonSchemaWith(a).session();
    const results = await session.lint("https://example.com/a", { plugins: [thenElseWithoutIf] });

    expect(results).to.have.length(1);
  });

  describe("files", () => {
    /** @type string */
    let directory;

    beforeAll(async () => {
      directory = await mkdtemp(join(tmpdir(), "json-schema-"));
    });

    afterAll(async () => {
      await rm(directory, { recursive: true });
    });

    test("a document that isn't a schema", async () => {
      const path = join(directory, "instance.json");
      await writeFile(path, "{}");
      const jsonSchema = new JsonSchema({ allowRetrieval: [pathToFileURL(join(directory, "/")).href] });

      await expect(jsonSchema.lint(pathToFileURL(path).href)).rejects.toThrow("isn't a schema");
    });
  });
});

/** @type (...schemas: string[]) => JsonSchema */
const jsonSchemaWith = (...schemas) => {
  const jsonSchema = new JsonSchema();
  addV1(jsonSchema);
  jsonSchema.addRegistry(new SchemaRegistry(schemas.map((schema) => ({ schema }))));
  return jsonSchema;
};
