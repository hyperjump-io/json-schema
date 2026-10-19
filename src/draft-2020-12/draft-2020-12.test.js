import { describe, test, beforeEach, expect } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { SchemaRegistry } from "../schema-registry.js";
import { addDraft202012, draft202012DialectUri } from "./index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 */

describe("draft-2020-12", () => {
  /** @type (config?: JsonSchemaConfig) => JsonSchema */
  const draft202012 = (config) => {
    const jsonSchema = new JsonSchema(config);
    jsonSchema.removeUriSchemePlugin("http");
    jsonSchema.removeUriSchemePlugin("https");
    addDraft202012(jsonSchema);
    return jsonSchema;
  };

  /** @type (jsonSchema: JsonSchema, schemas: Json[], uri: string) => ReturnType<JsonSchema["compile"]> */
  const compile = (jsonSchema, schemas, uri) => {
    const registry = new SchemaRegistry(schemas.map((schema) => ({ schema })));
    return jsonSchema.compile(uri, { registries: [registry] });
  };

  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = draft202012();
  });

  test("it can only be added once", () => {
    expect(() => addDraft202012(jsonSchema)).to.throw();
  });

  describe("the meta-schema", () => {
    test("is available without retrieving it", async () => {
      const validator = await jsonSchema.compile(draft202012DialectUri);

      expect(validator.validate({ type: "string", minLength: 1 })).to.equal(true);
      expect(validator.validate({ type: 1 })).to.equal(false);
    });

    test("validates subschemas through $dynamicRef", async () => {
      const validator = await jsonSchema.compile(draft202012DialectUri);

      expect(validator.validate({ properties: { foo: { minLength: -1 } } })).to.equal(false);
      expect(validator.validate({ $defs: { foo: { items: { type: 1 } } } })).to.equal(false);
    });

    test("an extended meta-schema's $dynamicAnchor applies to subschemas", async () => {
      const metaUri = "https://example.com/strict-meta";
      const validator = await compile(jsonSchema, [{
        $schema: draft202012DialectUri,
        $id: metaUri,
        $dynamicAnchor: "meta",
        $ref: draft202012DialectUri,
        unevaluatedProperties: false
      }], metaUri);

      expect(validator.validate({ type: "string" })).to.equal(true);
      expect(validator.validate({ properties: { foo: { type: "string" } } })).to.equal(true);
      expect(validator.validate({ properties: { foo: { unknown: true } } })).to.equal(false);
    });
  });

  describe("format", () => {
    const uri = "https://example.com/format";
    const schema = { $schema: draft202012DialectUri, $id: uri, format: "date" };

    test("is an annotation by default", async () => {
      const validator = await compile(jsonSchema, [schema], uri);

      expect(validator.validate("not a date")).to.equal(true);
    });

    test("validates if the config says so", async () => {
      const validator = await compile(draft202012({ validateFormats: true }), [schema], uri);

      expect(validator.validate("2026-10-17")).to.equal(true);
      expect(validator.validate("not a date")).to.equal(false);
    });

    test("validates in a dialect with the format-assertion vocabulary", async () => {
      const metaUri = "https://example.com/format-assertion-meta";
      const validator = await compile(jsonSchema, [
        {
          $schema: draft202012DialectUri,
          $id: metaUri,
          $vocabulary: {
            "https://json-schema.org/draft/2020-12/vocab/core": true,
            "https://json-schema.org/draft/2020-12/vocab/format-assertion": true
          }
        },
        { $schema: metaUri, $id: uri, format: "date" }
      ], uri);

      expect(validator.validate("not a date")).to.equal(false);
    });
  });
});
