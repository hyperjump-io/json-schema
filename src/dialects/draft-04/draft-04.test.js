import { describe, test, beforeEach, expect } from "vitest";
import { jsonSchemaConfig } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { draft04Dialect, draft04DialectUri } from "./index.js";
import { compile as compileSchema } from "../../operations/compile.js";
import { annotatorFor, validatorFor } from "../../operations/validate-compiled.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { JsonSchemaConfig, JsonSchemaOptions } from "../../json-schema.d.ts"
 * @import { CompiledSchema } from "../../operations/compile.d.ts"
 */

describe("draft-04", () => {
  /** @type (config?: JsonSchemaOptions & { allowRetrieval?: string[]; registry?: SchemaRegistry }) => JsonSchemaConfig */
  const draft04 = ({ registry, ...options } = {}) => jsonSchemaConfig({
    dialects: [draft04Dialect],
    ...options,
    allowRetrieval: [],
    registry
  });

  const $schema = `${draft04DialectUri}#`;
  const uri = "http://example.com/schema";

  /** @type (jsonSchema: JsonSchemaConfig, schema: Json) => Promise<CompiledSchema> */
  const compile = (jsonSchema, schema) => {
    const registry = new SchemaRegistry([{ schema, retrievalUri: uri }]);
    return compileSchema(jsonSchema, uri, { registry });
  };

  /** @type JsonSchemaConfig */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = draft04();
  });

  test("unknown keywords are ignored", async () => {
    const compiled = await compile(jsonSchema, { $schema, foo: "bar" });

    expect(annotatorFor(compiled)(1).node.data?.annotations).to.equal(undefined);
  });

  describe("maximum and minimum", () => {
    test("exclusiveMinimum and exclusiveMaximum require minimum and maximum", async () => {
      await expect(compile(jsonSchema, { $schema, exclusiveMinimum: true })).rejects.toMatchObject({ messages: [{ message: "'exclusiveMinimum' requires 'minimum'" }] });
      await expect(compile(jsonSchema, { $schema, exclusiveMaximum: false })).rejects.toMatchObject({ messages: [{ message: "'exclusiveMaximum' requires 'maximum'" }] });
    });
  });

  describe("format", () => {
    test("validates by default", async () => {
      const compiled = await compile(jsonSchema, { $schema, format: "ipv4" });

      expect(validatorFor(compiled)("127.0.0.1")).to.equal(true);
      expect(validatorFor(compiled)("not an ip")).to.equal(false);
    });

    test("is only an annotation if the config says so", async () => {
      const compiled = await compile(draft04({ validateFormats: false }), { $schema, format: "ipv4" });

      expect(validatorFor(compiled)("not an ip")).to.equal(true);
    });

    test("hostname doesn't need the full formats", async () => {
      const compiled = await compile(jsonSchema, { $schema, format: "hostname" });

      expect(validatorFor(compiled)("example.com")).to.equal(true);
      expect(validatorFor(compiled)("-invalid-")).to.equal(false);
    });

    test("a format draft-04 doesn't define is only an annotation", async () => {
      const compiled = await compile(jsonSchema, { $schema, format: "uri-reference" });

      expect(validatorFor(compiled)("not a uri reference")).to.equal(true);
    });
  });
});
