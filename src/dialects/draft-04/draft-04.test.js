import { describe, test, beforeEach, expect } from "vitest";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { draft04Dialect, draft04DialectUri } from "./index.js";
import { compile as compileSchema } from "../../operations/compile.js";
import { annotatorFor, validatorFor } from "../../operations/validate-compiled.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { JsonSchemaConfig } from "../../json-schema.d.ts"
 * @import { CompiledSchema } from "../../operations/compile.d.ts"
 */

describe("draft-04", () => {
  /** @type (config?: JsonSchemaConfig) => JsonSchema */
  const draft04 = (config) => {
    const jsonSchema = new JsonSchema({ allowRetrieval: [], dialects: [draft04Dialect], ...config });
    return jsonSchema;
  };

  const $schema = `${draft04DialectUri}#`;
  const uri = "http://example.com/schema";

  /** @type (jsonSchema: JsonSchema, schema: Json) => Promise<CompiledSchema> */
  const compile = (jsonSchema, schema) => {
    const registry = new SchemaRegistry([{ schema, retrievalUri: uri }]);
    return compileSchema(jsonSchema, uri, { registry });
  };

  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = draft04();
  });

  test("$ref replaces the whole schema", async () => {
    const compiled = await compile(jsonSchema, {
      $schema,
      definitions: { string: { type: "string" } },
      properties: { foo: { $ref: "#/definitions/string", maxLength: 1 } }
    });

    expect(validatorFor(compiled)({ foo: "long" })).to.equal(true);
    expect(validatorFor(compiled)({ foo: 1 })).to.equal(false);
  });

  test("unknown keywords are ignored", async () => {
    const compiled = await compile(jsonSchema, { $schema, foo: "bar" });

    expect(annotatorFor(compiled)(1).node.data?.annotations).to.equal(undefined);
  });

  describe("maximum and minimum", () => {
    test("are inclusive by default", async () => {
      const compiled = await compile(jsonSchema, { $schema, minimum: 1, maximum: 3 });

      expect(validatorFor(compiled)(1)).to.equal(true);
      expect(validatorFor(compiled)(3)).to.equal(true);
      expect(validatorFor(compiled)(0)).to.equal(false);
      expect(validatorFor(compiled)(4)).to.equal(false);
    });

    test("are exclusive with exclusiveMinimum and exclusiveMaximum", async () => {
      const compiled = await compile(jsonSchema, { $schema, minimum: 1, exclusiveMinimum: true, maximum: 3, exclusiveMaximum: true });

      expect(validatorFor(compiled)(2)).to.equal(true);
      expect(validatorFor(compiled)(1)).to.equal(false);
      expect(validatorFor(compiled)(3)).to.equal(false);
    });

    test("are inclusive with exclusiveMinimum and exclusiveMaximum false", async () => {
      const compiled = await compile(jsonSchema, { $schema, minimum: 1, exclusiveMinimum: false, maximum: 3, exclusiveMaximum: false });

      expect(validatorFor(compiled)(1)).to.equal(true);
      expect(validatorFor(compiled)(3)).to.equal(true);
    });

    test("exclusiveMinimum and exclusiveMaximum require minimum and maximum", async () => {
      await expect(compile(jsonSchema, { $schema, exclusiveMinimum: true })).rejects.toMatchObject({ messages: [{ message: "'exclusiveMinimum' requires 'minimum'" }] });
      await expect(compile(jsonSchema, { $schema, exclusiveMaximum: false })).rejects.toMatchObject({ messages: [{ message: "'exclusiveMaximum' requires 'maximum'" }] });
    });
  });

  describe("dependencies", () => {
    test("an array is properties that are required too", async () => {
      const compiled = await compile(jsonSchema, { $schema, dependencies: { foo: ["bar"] } });

      expect(validatorFor(compiled)({ foo: 1, bar: 2 })).to.equal(true);
      expect(validatorFor(compiled)({ bar: 2 })).to.equal(true);
      expect(validatorFor(compiled)({ foo: 1 })).to.equal(false);
    });

    test("a schema applies to the whole instance", async () => {
      const compiled = await compile(jsonSchema, { $schema, dependencies: { foo: { required: ["bar"] } } });

      expect(validatorFor(compiled)({ foo: 1, bar: 2 })).to.equal(true);
      expect(validatorFor(compiled)({ foo: 1 })).to.equal(false);
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
