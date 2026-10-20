import { describe, test, beforeEach, expect } from "vitest";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { addDraft202012, draft202012DialectUri } from "./index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaConfig } from "../../json-schema.d.ts"
 */

describe("draft-2020-12", () => {
  /** @type (config?: JsonSchemaConfig) => JsonSchema */
  const draft202012 = (config) => {
    const jsonSchema = new JsonSchema({ allowRetrieval: () => false, ...config });
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
