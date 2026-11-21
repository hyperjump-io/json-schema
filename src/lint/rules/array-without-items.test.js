import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse, Hyperjump } from "@hyperjump/browser";
import { jsonSchemaConfig } from "../../json-schema.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { draft04Dialect, draft04DialectUri } from "../../dialects/draft-04/index.js";
import { openApi30Dialect, openApi30DialectUri } from "../../dialects/openapi-3-0/index.js";
import arrayWithoutItems from "./array-without-items.js";

describe("array-without-items", () => {
  test("type array without items", async () => {
    const file = await lint(`{ "type": "array" }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'type' is 'array' without 'items', which OpenAPI 3.0 requires"
    ]);
    expect(file.messages[0].ruleId).to.equal("array-without-items");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 3, offset: 2 },
      end: { line: 1, column: 18, offset: 17 }
    });
  });

  test("type array with items", async () => {
    const file = await lint(`{ "type": "array", "items": {} }`);
    expect(file.messages).to.eql([]);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "type": "object", "properties": { "foo": { "type": "array" } } }`);
    expect(file.messages).to.have.length(1);
  });

  test("items in another schema doesn't count", async () => {
    const file = await lint(`{ "type": "array", "allOf": [{ "items": {} }] }`);
    expect(file.messages).to.have.length(1);
  });

  test("other types", async () => {
    const file = await lint(`{ "type": "object" }`);
    expect(file.messages).to.eql([]);
  });

  test("a property named type isn't a keyword", async () => {
    const file = await lint(`{ "type": "object", "properties": { "type": { "type": "string" } } }`);
    expect(file.messages).to.eql([]);
  });

  test("other dialects", async () => {
    const file = await lint(`{ "type": "array" }`, draft04DialectUri);
    expect(file.messages).to.eql([]);
  });
});

/** @type (json: string, dialectUri?: string) => Promise<VFile> */
const lint = async (json, dialectUri = openApi30DialectUri) => {
  const jsonSchema = jsonSchemaConfig({ dialects: [draft04Dialect, openApi30Dialect] });
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session: new Hyperjump(jsonSchema), dialectUri })
    .use(arrayWithoutItems);
  await processor.run(processor.parse(file), file);
  return file;
};
