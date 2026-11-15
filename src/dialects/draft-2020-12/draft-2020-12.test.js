import { describe, test, beforeEach, expect } from "vitest";
import { jsonSchemaConfig } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { draft202012Dialect, draft202012DialectUri } from "./index.js";
import { compile as compileSchema } from "../../operations/compile.js";
import { validatorFor } from "../../operations/validate-compiled.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { JsonSchemaConfig, JsonSchemaOptions } from "../../json-schema.d.ts"
 * @import { CompiledSchema } from "../../operations/compile.d.ts"
 */

describe("draft-2020-12", () => {
  /** @type (config?: JsonSchemaOptions & { allowRetrieval?: string[]; registry?: SchemaRegistry }) => JsonSchemaConfig */
  const draft202012 = ({ registry, ...options } = {}) => jsonSchemaConfig({
    dialects: [draft202012Dialect],
    ...options,
    allowRetrieval: [],
    registry
  });

  /** @type (jsonSchema: JsonSchemaConfig, schemas: Json[], uri: string) => Promise<CompiledSchema> */
  const compile = (jsonSchema, schemas, uri) => {
    const registry = new SchemaRegistry(schemas.map((schema) => ({ schema })));
    return compileSchema(jsonSchema, uri, { registry });
  };

  /** @type JsonSchemaConfig */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = draft202012();
  });

  describe("format", () => {
    const uri = "https://example.com/format";
    const schema = { $schema: draft202012DialectUri, $id: uri, format: "date" };

    test("is an annotation by default", async () => {
      const compiled = await compile(jsonSchema, [schema], uri);

      expect(validatorFor(compiled)("not a date")).to.equal(true);
    });

    test("validates if the config says so", async () => {
      const compiled = await compile(draft202012({ validateFormats: true }), [schema], uri);

      expect(validatorFor(compiled)("2026-10-17")).to.equal(true);
      expect(validatorFor(compiled)("not a date")).to.equal(false);
    });

    test("validates in a dialect with the format-assertion vocabulary", async () => {
      const metaUri = "https://example.com/format-assertion-meta";
      const compiled = await compile(jsonSchema, [
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

      expect(validatorFor(compiled)("not a date")).to.equal(false);
    });
  });
});
