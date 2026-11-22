import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse, Hyperjump } from "@hyperjump/browser";
import { jsonSchemaConfig } from "../../json-schema.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { draft04Dialect, draft04DialectUri } from "../../dialects/draft-04/index.js";
import { openApi30Dialect, openApi30DialectUri } from "../../dialects/openapi-3-0/index.js";
import nullableWithoutType from "./nullable-without-type.js";

describe("nullable-without-type", () => {
  test("nullable without type", async () => {
    const file = await lint(`{ "nullable": true, "minLength": 1 }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'nullable' has no effect without 'type'"]);
    expect(file.messages[0].ruleId).to.equal("nullable-without-type");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 3, offset: 2 },
      end: { line: 1, column: 19, offset: 18 }
    });
  });

  test("with type", async () => {
    const file = await lint(`{ "type": "string", "nullable": true }`);
    expect(file.messages).to.eql([]);
  });

  test("type in another schema doesn't count", async () => {
    const file = await lint(`{ "nullable": true, "allOf": [{ "type": "string" }] }`);
    expect(file.messages).to.have.length(1);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "type": "object", "properties": { "foo": { "nullable": false } } }`);
    expect(file.messages).to.have.length(1);
  });

  test("a property named nullable isn't a keyword", async () => {
    const file = await lint(`{ "type": "object", "properties": { "nullable": { "type": "boolean" } } }`);
    expect(file.messages).to.eql([]);
  });

  test("other dialects", async () => {
    const file = await lint(`{ "nullable": true }`, draft04DialectUri);
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
    .use(nullableWithoutType);
  await processor.run(processor.parse(file), file);
  return file;
};
