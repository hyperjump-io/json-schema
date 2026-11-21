import { readFileSync } from "node:fs";
import { describe, test, beforeEach, expect } from "vitest";
import { jsonSchemaConfig } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { draft202012Dialect } from "../draft-2020-12/index.js";
import { openApi31Vocabulary, openApi31VocabularyUri } from "./index.js";
import { compile as compileSchema } from "../../operations/compile.js";
import { annotatorFor, validatorFor } from "../../operations/validate-compiled.js";
import { annotation } from "../../annotation.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { JsonSchemaConfig } from "../../json-schema.d.ts"
 * @import { CompiledSchema } from "../../operations/compile.d.ts"
 */

/** @type (file: string) => Json */
const readMetaSchema = (file) => JSON.parse(readFileSync(new URL(`meta-schemas/${file}`, import.meta.url), "utf8"));

describe("OpenAPI 3.1", () => {
  const uri = "https://example.com/schema";
  const $schema = "https://spec.openapis.org/oas/3.1/dialect/2024-11-10";
  const metaSchema = readMetaSchema("dialect-2024-11-10.json");
  /** @type (name: string) => string */
  const keyword = (name) => `https://spec.openapis.org/oas/${name === "example" || name === "externalDocs" ? "3.2" : "3.1"}/keyword/${name}`;

  /** @type (jsonSchema: JsonSchemaConfig, schema: Json, metaSchemas?: Json[]) => Promise<CompiledSchema> */
  const compile = (jsonSchema, schema, metaSchemas = [metaSchema]) => {
    const registry = new SchemaRegistry([...metaSchemas, schema].map((schema) => ({ schema })));
    return compileSchema(jsonSchema, uri, { registry });
  };

  /** @type JsonSchemaConfig */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = jsonSchemaConfig({
      dialects: [draft202012Dialect],
      vocabularies: { [openApi31VocabularyUri]: openApi31Vocabulary },
      allowRetrieval: []
    });
  });

  test("OpenAPI's keywords are annotations", async () => {
    const discriminator = { propertyName: "kind" };
    const externalDocs = { url: "https://example.com/docs" };
    const xml = { name: "pet" };
    const compiled = await compile(jsonSchema, { $schema, $id: uri, discriminator, example: 1, externalDocs, xml });

    const { node } = annotatorFor(compiled)({});
    expect(annotation(jsonSchema, node, keyword("discriminator"))).to.eql([discriminator]);
    expect(annotation(jsonSchema, node, keyword("example"))).to.eql([1]);
    expect(annotation(jsonSchema, node, keyword("externalDocs"))).to.eql([externalDocs]);
    expect(annotation(jsonSchema, node, keyword("xml"))).to.eql([xml]);
  });

  test("2020-12's keywords validate", async () => {
    const compiled = await compile(jsonSchema, { $schema, $id: uri, type: ["string", "null"] });

    expect(validatorFor(compiled)(null)).to.equal(true);
    expect(validatorFor(compiled)(1)).to.equal(false);
  });

  test("unknown keywords are annotations", async () => {
    const compiled = await compile(jsonSchema, { $schema, $id: uri, nullable: true });

    const { node } = annotatorFor(compiled)(1);
    expect(annotation(jsonSchema, node, "https://json-schema.org/keyword/unknown#nullable")).to.eql([true]);
  });

  test("without the vocabulary in the config, OpenAPI's keywords are unknown keywords", async () => {
    const config = jsonSchemaConfig({ dialects: [draft202012Dialect], allowRetrieval: [] });
    const compiled = await compile(config, { $schema, $id: uri, discriminator: {} });

    const { node } = annotatorFor(compiled)({});
    expect(annotation(config, node, "https://json-schema.org/keyword/unknown#discriminator")).to.eql([{}]);
  });

  test("every string is a password", async () => {
    const config = jsonSchemaConfig({
      dialects: [draft202012Dialect],
      vocabularies: { [openApi31VocabularyUri]: openApi31Vocabulary },
      validateFormats: true,
      allowRetrieval: []
    });
    const compiled = await compile(config, { $schema, $id: uri, format: "password" });

    expect(validatorFor(compiled)("hunter2")).to.equal(true);
  });

  test("int32 is a signed 32-bit integer", async () => {
    const config = jsonSchemaConfig({
      dialects: [draft202012Dialect],
      vocabularies: { [openApi31VocabularyUri]: openApi31Vocabulary },
      validateFormats: true,
      allowRetrieval: []
    });
    const compiled = await compile(config, { $schema, $id: uri, format: "int32" });

    expect(validatorFor(compiled)(2147483647)).to.equal(true);
    expect(validatorFor(compiled)(2147483648)).to.equal(false);
    expect(validatorFor(compiled)(1.5)).to.equal(false);
    expect(validatorFor(compiled)("1")).to.equal(true);
  });

  test("the meta-schema has to be found", async () => {
    await expect(compile(jsonSchema, { $schema, $id: uri }, [])).rejects.toThrow(`'${uri}' is in the registry, but it can't be identified until the '${$schema}' dialect is defined`);
  });

  test("discriminator needs a propertyName", async () => {
    await expect(compile(jsonSchema, { $schema, $id: uri, discriminator: {} })).rejects.toMatchObject({ messages: [{ message: "'propertyName' is required" }] });
  });

  test("discriminator has no defaultMapping, so it isn't checked", async () => {
    const compiled = await compile(jsonSchema, { $schema, $id: uri, discriminator: { propertyName: "kind", defaultMapping: 1 } });

    expect(validatorFor(compiled)(1)).to.equal(true);
  });

  test("the base meta-schema defines the same dialect", async () => {
    const base = "https://spec.openapis.org/oas/3.1/dialect/base";
    const compiled = await compile(jsonSchema, { $schema: base, $id: uri, type: "string", discriminator: { propertyName: "kind" } }, [readMetaSchema("dialect-base.json")]);

    expect(validatorFor(compiled)(1)).to.equal(false);
    const { node } = annotatorFor(compiled)("foo");
    expect(annotation(jsonSchema, node, keyword("discriminator"))).to.eql([{ propertyName: "kind" }]);
  });
});
