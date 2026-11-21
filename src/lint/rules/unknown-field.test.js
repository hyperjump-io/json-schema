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
import unknownField from "./unknown-field.js";

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

describe("unknown-field", () => {
  test("a field the Discriminator Object doesn't define", async () => {
    const file = await lint(`{ "discriminator": { "propertyName": "kind", "foo": 1 } }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'foo' isn't a field of the Discriminator Object, so tools ignore it."
    ]);
    expect(file.messages[0].ruleId).to.equal("unknown-field");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 46, offset: 45 },
      end: { line: 1, column: 51, offset: 50 }
    });
  });

  test("a field in a different case", async () => {
    const file = await lint(`{ "discriminator": { "propertyname": "kind" } }`);
    // Without propertyName, the keyword's check reports it too
    const messages = file.messages.filter((message) => message.ruleId === "unknown-field");
    expect(messages.map((message) => message.reason)).to.eql([
      "'propertyname' isn't a field of the Discriminator Object, so tools ignore it. Did you mean 'propertyName'?"
    ]);
  });

  test("the External Documentation Object", async () => {
    const file = await lint(`{ "externalDocs": { "url": "https://example.com", "title": "Docs" } }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'title' isn't a field of the External Documentation Object, so tools ignore it."
    ]);
  });

  test("the XML Object", async () => {
    const file = await lint(`{ "xml": { "name": "pet", "Namespace": "https://example.com/pets" } }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'Namespace' isn't a field of the XML Object, so tools ignore it. Did you mean 'namespace'?"
    ]);
  });

  test("every field", async () => {
    const file = await lint(`{
      "discriminator": { "propertyName": "kind", "mapping": {} },
      "externalDocs": { "description": "Docs", "url": "https://example.com" },
      "xml": { "name": "pet", "namespace": "https://example.com/pets", "prefix": "p", "attribute": false, "wrapped": false }
    }`);
    expect(file.messages).to.eql([]);
  });

  test("x- fields are Specification Extensions", async () => {
    const file = await lint(`{
      "discriminator": { "propertyName": "kind", "x-internal": true },
      "externalDocs": { "url": "https://example.com", "x-internal": true },
      "xml": { "name": "pet", "x-internal": true }
    }`);
    expect(file.messages).to.eql([]);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "properties": { "foo": { "xml": { "nme": "foo" } } } }`);
    expect(file.messages).to.have.length(1);
  });

  test("a property named like the keyword isn't one", async () => {
    const file = await lint(`{ "properties": { "xml": { "type": "object" } } }`);
    expect(file.messages).to.eql([]);
  });

  test("OpenAPI 3.1", async () => {
    const file = await lint(`{ "$schema": "${openApi31}", "discriminator": { "propertyName": "kind", "defaultMapping": "Cat" }, "xml": { "nodeType": "element" } }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'defaultMapping' isn't a field of the Discriminator Object, so tools ignore it.",
      "'nodeType' isn't a field of the XML Object, so tools ignore it."
    ]);
  });

  test("OpenAPI 3.2 adds defaultMapping and nodeType", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "discriminator": { "propertyName": "kind", "defaultMapping": "Cat" }, "xml": { "nodeType": "element" } }`);
    expect(file.messages).to.eql([]);
  });

  test("OpenAPI 3.2", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "externalDocs": { "url": "https://example.com", "summary": "Docs" } }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'summary' isn't a field of the External Documentation Object, so tools ignore it."
    ]);
  });

  test("a value that isn't an object is the keyword's check's", async () => {
    const file = await lint(`{ "$schema": "${openApi32}", "xml": "pet" }`);
    expect(file.messages.filter((message) => message.ruleId === "unknown-field")).to.eql([]);
  });

  test("without OpenAPI's vocabulary, they aren't keywords", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/draft/2020-12/schema", "xml": { "foo": 1 } }`);
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
    .use(unknownField);
  await processor.run(processor.parse(file), file);
  return file;
};
