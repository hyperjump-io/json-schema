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
import deprecatedExample from "./deprecated-example.js";

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

describe("deprecated-example", () => {
  test("example in OpenAPI 3.2", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "example": "Misty" }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'example' is deprecated. Use 'examples', which is an array of examples, instead."
    ]);
    expect(file.messages[0].ruleId).to.equal("deprecated-example");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 70, offset: 69 },
      end: { line: 1, column: 88, offset: 87 }
    });
  });

  test("example in OpenAPI 3.1", async () => {
    const file = await lint(`{ "$schema": "${openApi31}", "example": "Misty" }`);
    expect(file.messages).to.have.length(1);
  });

  test("next to examples", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "example": "Misty", "examples": ["Tom"] }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'example' is deprecated. Add its value to 'examples' instead."
    ]);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "properties": { "name": { "example": "Misty" } } }`);
    expect(file.messages).to.have.length(1);
  });

  test("examples", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "examples": ["Misty"] }`);
    expect(file.messages).to.eql([]);
  });

  test("a property named example isn't a keyword", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "properties": { "example": { "type": "string" } } }`);
    expect(file.messages).to.eql([]);
  });

  test("OpenAPI 3.0 has no examples, and example isn't deprecated", async () => {
    const file = await lint(`{ "example": "Misty" }`, openApi30DialectUri);
    expect(file.messages).to.eql([]);
  });

  test("without OpenAPI's vocabulary, it isn't a keyword", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/draft/2020-12/schema", "example": "Misty" }`);
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
    .use(deprecatedExample);
  await processor.run(processor.parse(file), file);
  return file;
};
