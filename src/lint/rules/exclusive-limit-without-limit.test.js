import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse, Hyperjump } from "@hyperjump/browser";
import { jsonSchemaConfig } from "../../json-schema.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { draft04Dialect, draft04DialectUri } from "../../dialects/draft-04/index.js";
import { draft202012Dialect } from "../../dialects/draft-2020-12/index.js";
import { openApi30Dialect, openApi30DialectUri } from "../../dialects/openapi-3-0/index.js";
import exclusiveLimitWithoutLimit from "./exclusive-limit-without-limit.js";

describe("exclusive-limit-without-limit", () => {
  test("exclusiveMaximum without maximum", async () => {
    const file = await lint(`{ "type": "number", "exclusiveMaximum": true }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'exclusiveMaximum' has no effect without 'maximum'"]);
    expect(file.messages[0].ruleId).to.equal("exclusive-limit-without-limit");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 21, offset: 20 },
      end: { line: 1, column: 45, offset: 44 }
    });
  });

  test("exclusiveMinimum without minimum", async () => {
    const file = await lint(`{ "type": "number", "exclusiveMinimum": false }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'exclusiveMinimum' has no effect without 'minimum'"]);
  });

  test("with the limit", async () => {
    const file = await lint(`{ "type": "number", "maximum": 1, "exclusiveMaximum": true, "minimum": 0, "exclusiveMinimum": true }`);
    expect(file.messages).to.eql([]);
  });

  test("the other limit doesn't count", async () => {
    const file = await lint(`{ "type": "number", "minimum": 0, "exclusiveMaximum": true }`);
    expect(file.messages).to.have.length(1);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "type": "object", "properties": { "foo": { "exclusiveMaximum": true } } }`);
    expect(file.messages).to.have.length(1);
  });

  test("a property named exclusiveMaximum isn't a keyword", async () => {
    const file = await lint(`{ "type": "object", "properties": { "exclusiveMaximum": { "type": "boolean" } } }`);
    expect(file.messages).to.eql([]);
  });

  test("draft-04", async () => {
    const file = await lint(`{ "type": "number", "exclusiveMaximum": true }`, draft04DialectUri);
    expect(file.messages.map((message) => message.reason)).to.eql(["'exclusiveMaximum' has no effect without 'maximum'"]);
  });

  test("a dialect with exclusiveMaximum that's a number", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/draft/2020-12/schema", "exclusiveMaximum": 1 }`);
    expect(file.messages).to.eql([]);
  });
});

/** @type (json: string, dialectUri?: string) => Promise<VFile> */
const lint = async (json, dialectUri = openApi30DialectUri) => {
  const jsonSchema = jsonSchemaConfig({ dialects: [draft04Dialect, draft202012Dialect, openApi30Dialect] });
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session: new Hyperjump(jsonSchema), dialectUri })
    .use(exclusiveLimitWithoutLimit);
  await processor.run(processor.parse(file), file);
  return file;
};
