import { readFileSync } from "node:fs";
import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse, Hyperjump } from "@hyperjump/browser";
import { jsonSchemaConfig } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { draft202012Dialect } from "../../dialects/draft-2020-12/index.js";
import { openApi30Dialect, openApi30DialectUri } from "../../dialects/openapi-3-0/index.js";
import { openApi31Vocabulary, openApi31VocabularyUri } from "../../dialects/openapi-3-1/index.js";
import { openApi32Vocabulary, openApi32VocabularyUri } from "../../dialects/openapi-3-2/index.js";
import wrappedWithoutArray from "./wrapped-without-array.js";

/**
 * @import { Json } from "@hyperjump/browser"
 */

/** @type (path: string) => Json */
const readMetaSchema = (path) => JSON.parse(readFileSync(new URL(`../../dialects/${path}`, import.meta.url), "utf8"));

const openApi31 = "https://spec.openapis.org/oas/3.1/dialect/2024-11-10";
const openApi32 = "https://spec.openapis.org/oas/3.2/dialect/2026-02-26";

const jsonSchema = jsonSchemaConfig({
  dialects: [draft202012Dialect, openApi30Dialect],
  vocabularies: {
    [openApi31VocabularyUri]: openApi31Vocabulary,
    [openApi32VocabularyUri]: openApi32Vocabulary
  },
  allowRetrieval: []
});

describe("wrapped-without-array", () => {
  test("wrapped in a schema that isn't an array", async () => {
    const file = await lint(`{ "type": "string", "xml": { "wrapped": true } }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'wrapped' has no effect, because it only applies to a schema whose type is 'array'"
    ]);
    expect(file.messages[0].ruleId).to.equal("wrapped-without-array");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 30, offset: 29 },
      end: { line: 1, column: 45, offset: 44 }
    });
  });

  test("without type", async () => {
    const file = await lint(`{ "xml": { "wrapped": true } }`);
    expect(file.messages).to.have.length(1);
  });

  test("an array", async () => {
    const file = await lint(`{ "type": "array", "items": {}, "xml": { "wrapped": true } }`);
    expect(file.messages).to.eql([]);
  });

  test("type in another schema doesn't count", async () => {
    const file = await lint(`{ "allOf": [{ "type": "array", "items": {} }], "xml": { "wrapped": true } }`);
    expect(file.messages).to.have.length(1);
  });

  test("in items, outside the array", async () => {
    const file = await lint(`{ "type": "array", "items": { "type": "string", "xml": { "wrapped": true } } }`);
    expect(file.messages).to.have.length(1);
  });

  test("wrapped: false is the default", async () => {
    const file = await lint(`{ "type": "string", "xml": { "wrapped": false } }`);
    expect(file.messages).to.eql([]);
  });

  test("OpenAPI 3.1, with a type that allows arrays", async () => {
    const file = await lint(`{ "$schema": "${openApi31}", "type": ["array", "null"], "xml": { "wrapped": true } }`);
    expect(file.messages).to.eql([]);
  });

  test("OpenAPI 3.1", async () => {
    const file = await lint(`{ "$schema": "${openApi31}", "type": "object", "xml": { "wrapped": true } }`);
    expect(file.messages).to.have.length(1);
  });

  test("OpenAPI 3.2", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "type": "object", "xml": { "wrapped": true } }`);
    expect(file.messages).to.have.length(1);
  });

  test("a property named xml isn't a keyword", async () => {
    const file = await lint(`{ "type": "object", "properties": { "xml": { "type": "object", "properties": { "wrapped": { "type": "boolean" } } } } }`);
    expect(file.messages).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const registry = new SchemaRegistry([
    { schema: readMetaSchema("openapi-3-1/meta-schemas/dialect-2024-11-10.json") },
    { schema: readMetaSchema("openapi-3-2/meta-schemas/dialect-2026-02-26.json") }
  ]);
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, {
      session: new Hyperjump({ ...jsonSchema, registry }),
      ...!json.includes(`"$schema"`) && { dialectUri: openApi30DialectUri }
    })
    .use(wrappedWithoutArray);
  await processor.run(processor.parse(file), file);
  return file;
};
