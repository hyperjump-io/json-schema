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
import deprecatedXmlField from "./deprecated-xml-field.js";

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

describe("deprecated-xml-field", () => {
  test("attribute: true", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "xml": { "attribute": true } }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      `'attribute' is deprecated. Use '"nodeType": "attribute"' instead.`
    ]);
    expect(file.messages[0].ruleId).to.equal("deprecated-xml-field");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 79, offset: 78 },
      end: { line: 1, column: 96, offset: 95 }
    });
  });

  test("wrapped: true", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "type": "array", "items": {}, "xml": { "wrapped": true } }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      `'wrapped' is deprecated. Use '"nodeType": "element"' instead.`
    ]);
  });

  test("false is the default", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "xml": { "attribute": false, "wrapped": false } }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'attribute' is deprecated. Remove it. 'false' is the default.",
      "'wrapped' is deprecated. Remove it. 'false' is the default."
    ]);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "properties": { "id": { "xml": { "attribute": true } } } }`);
    expect(file.messages).to.have.length(1);
  });

  test("nodeType", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "xml": { "nodeType": "attribute", "name": "id" } }`);
    expect(file.messages).to.eql([]);
  });

  test("a value that isn't a boolean is the keyword's check's", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "xml": { "attribute": "yes" } }`);
    expect(file.messages.filter((message) => message.ruleId === "deprecated-xml-field")).to.eql([]);
  });

  test("OpenAPI 3.1 has no nodeType", async () => {
    const file = await lint(`{ "$schema": "${openApi31}", "xml": { "attribute": true } }`);
    expect(file.messages).to.eql([]);
  });

  test("OpenAPI 3.0 has no nodeType", async () => {
    const file = await lint(`{ "xml": { "attribute": true } }`, openApi30DialectUri);
    expect(file.messages).to.eql([]);
  });
});

/** @type (json: string, dialectUri?: string) => Promise<VFile> */
const lint = async (json, dialectUri) => {
  const registry = new SchemaRegistry([
    { schema: readMetaSchema("openapi-3-1/meta-schemas/dialect-2024-11-10.json") },
    { schema: readMetaSchema("openapi-3-2/meta-schemas/dialect-2026-02-26.json") }
  ]);
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session: new Hyperjump({ ...jsonSchema, registry }), dialectUri })
    .use(deprecatedXmlField);
  await processor.run(processor.parse(file), file);
  return file;
};
