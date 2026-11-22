import { describe, test, beforeEach, expect } from "vitest";
import { jsonSchemaConfig } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { openApi30Dialect, openApi30DialectUri } from "./index.js";
import { compile as compileSchema } from "../../operations/compile.js";
import { annotatorFor, validatorFor } from "../../operations/validate-compiled.js";
import { annotation } from "../../annotation.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { JsonSchemaConfig } from "../../json-schema.d.ts"
 * @import { CompiledSchema } from "../../operations/compile.d.ts"
 */

describe("OpenAPI 3.0", () => {
  const uri = "https://example.com/schema";

  // Schema Objects don't have `$schema`, so the registry gives the dialect
  /** @type (jsonSchema: JsonSchemaConfig, schema: Json) => Promise<CompiledSchema> */
  const compile = (jsonSchema, schema) => {
    const registry = new SchemaRegistry([{ schema, retrievalUri: uri, dialectUri: openApi30DialectUri }]);
    return compileSchema(jsonSchema, uri, { registry });
  };

  /** @type JsonSchemaConfig */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = jsonSchemaConfig({ dialects: [openApi30Dialect], allowRetrieval: [] });
  });

  describe("type and nullable", () => {
    test("type is one type", async () => {
      const compiled = await compile(jsonSchema, { type: "integer" });

      expect(validatorFor(compiled)(1)).to.equal(true);
      expect(validatorFor(compiled)(1.5)).to.equal(false);
      expect(validatorFor(compiled)(null)).to.equal(false);
    });

    test("type can't be an array or 'null'", async () => {
      await expect(compile(jsonSchema, { type: ["string", "null"] })).rejects.toMatchObject({ messages: [{ message: "Expected one of 'array', 'boolean', 'integer', 'number', 'object', 'string'" }] });
      await expect(compile(jsonSchema, { type: "null" })).rejects.toMatchObject({ messages: [{ message: "Expected one of 'array', 'boolean', 'integer', 'number', 'object', 'string'" }] });
    });

    test("nullable: true allows null", async () => {
      const compiled = await compile(jsonSchema, { type: "string", nullable: true });

      expect(validatorFor(compiled)("foo")).to.equal(true);
      expect(validatorFor(compiled)(null)).to.equal(true);
      expect(validatorFor(compiled)(1)).to.equal(false);
    });

    test("nullable: false doesn't", async () => {
      const compiled = await compile(jsonSchema, { type: "string", nullable: false });

      expect(validatorFor(compiled)(null)).to.equal(false);
    });

    test("nullable doesn't change other keywords", async () => {
      const compiled = await compile(jsonSchema, { type: "string", nullable: true, enum: ["foo"] });

      expect(validatorFor(compiled)(null)).to.equal(false);
    });

    test("nullable without type does nothing", async () => {
      const compiled = await compile(jsonSchema, { nullable: true, minLength: 1 });

      expect(validatorFor(compiled)(null)).to.equal(true);
      expect(validatorFor(compiled)("")).to.equal(false);
    });

    test("nullable is a boolean", async () => {
      await expect(compile(jsonSchema, { type: "string", nullable: "true" })).rejects.toMatchObject({ messages: [{ message: "Expected a boolean" }] });
    });
  });

  describe("unknown keywords", () => {
    test("are errors", async () => {
      await expect(compile(jsonSchema, { patternProperties: {} })).rejects.toMatchObject({ messages: [{ message: `'patternProperties' isn't a keyword in the '${openApi30DialectUri}' dialect` }] });
    });

    test("except x- keywords, which are annotations", async () => {
      const compiled = await compile(jsonSchema, { "x-internal": true });

      const { node } = annotatorFor(compiled)(1);
      expect(annotation(jsonSchema, node, "x-internal", openApi30DialectUri)).to.eql([true]);
    });
  });

  test("$ref replaces the whole schema", async () => {
    const compiled = await compile(jsonSchema, {
      properties: {
        foo: { $ref: "#/properties/bar", type: "string" },
        bar: { type: "integer" }
      }
    });

    expect(validatorFor(compiled)({ foo: 1 })).to.equal(true);
    expect(validatorFor(compiled)({ foo: "1" })).to.equal(false);
  });

  test("enum can be empty and have duplicates, which 3.0's JSON Schema draft says it should not", async () => {
    // `keyword-allows-nothing` and `duplicate-enum-values` report them
    const empty = await compile(jsonSchema, { enum: [] });
    expect(validatorFor(empty)("a")).to.equal(false);

    const duplicates = await compile(jsonSchema, { enum: ["a", "a"] });
    expect(validatorFor(duplicates)("a")).to.equal(true);
  });

  test("exclusiveMaximum and exclusiveMinimum make maximum and minimum exclusive", async () => {
    const compiled = await compile(jsonSchema, { minimum: 1, exclusiveMinimum: true, maximum: 3, exclusiveMaximum: true });

    expect(validatorFor(compiled)(1)).to.equal(false);
    expect(validatorFor(compiled)(2)).to.equal(true);
    expect(validatorFor(compiled)(3)).to.equal(false);
  });

  test("exclusiveMaximum and exclusiveMinimum don't require maximum and minimum, as draft-04's do", async () => {
    // 3.0's JSON Schema draft, draft-wright-00, doesn't require them
    const compiled = await compile(jsonSchema, { exclusiveMaximum: true, exclusiveMinimum: true });

    expect(validatorFor(compiled)(1)).to.equal(true);
  });

  test("items is a schema", async () => {
    await expect(compile(jsonSchema, { items: [{}] })).rejects.toMatchObject({ messages: [{ message: "A schema must be an object or a boolean" }] });
  });

  test("format is an annotation by default", async () => {
    const compiled = await compile(jsonSchema, { format: "date" });

    expect(validatorFor(compiled)("not a date")).to.equal(true);
  });

  test("a format 3.0 has validates if the config says so", async () => {
    const compiled = await compile(jsonSchemaConfig({ dialects: [openApi30Dialect], validateFormats: true, allowRetrieval: [] }), { format: "date" });

    expect(validatorFor(compiled)("2026-11-21")).to.equal(true);
    expect(validatorFor(compiled)("not a date")).to.equal(false);
  });

  test("every string is a password", async () => {
    const compiled = await compile(jsonSchemaConfig({ dialects: [openApi30Dialect], validateFormats: true, allowRetrieval: [] }), { format: "password" });

    expect(validatorFor(compiled)("hunter2")).to.equal(true);
  });

  test("int32 is a signed 32-bit integer", async () => {
    const compiled = await compile(jsonSchemaConfig({ dialects: [openApi30Dialect], validateFormats: true, allowRetrieval: [] }), { format: "int32" });

    expect(validatorFor(compiled)(-2147483648)).to.equal(true);
    expect(validatorFor(compiled)(-2147483649)).to.equal(false);
    expect(validatorFor(compiled)(1.5)).to.equal(false);
    expect(validatorFor(compiled)("1")).to.equal(true);
  });

  describe("OpenAPI's keywords", () => {
    test("are annotations", async () => {
      const discriminator = { propertyName: "kind", mapping: { cat: "#/components/schemas/Cat" } };
      const externalDocs = { url: "https://example.com/docs", description: "Docs" };
      const xml = { name: "pet", namespace: "https://example.com/pet", prefix: "p", attribute: false, wrapped: true };
      const compiled = await compile(jsonSchema, { discriminator, example: { kind: "cat" }, externalDocs, xml });

      const { node } = annotatorFor(compiled)({ kind: "cat" });
      expect(annotation(jsonSchema, node, "discriminator", openApi30DialectUri)).to.eql([discriminator]);
      expect(annotation(jsonSchema, node, "example", openApi30DialectUri)).to.eql([{ kind: "cat" }]);
      expect(annotation(jsonSchema, node, "externalDocs", openApi30DialectUri)).to.eql([externalDocs]);
      expect(annotation(jsonSchema, node, "xml", openApi30DialectUri)).to.eql([xml]);
    });

    test("discriminator needs a propertyName", async () => {
      await expect(compile(jsonSchema, { discriminator: { mapping: {} } })).rejects.toMatchObject({ messages: [{ message: "'propertyName' is required" }] });
    });

    test("discriminator's mapping is strings", async () => {
      await expect(compile(jsonSchema, { discriminator: { propertyName: "kind", mapping: { cat: 1 } } })).rejects.toMatchObject({ messages: [{ message: "Expected a string" }] });
    });

    test("externalDocs needs a url that's a URI reference", async () => {
      await expect(compile(jsonSchema, { externalDocs: {} })).rejects.toMatchObject({ messages: [{ message: "'url' is required" }] });
      await expect(compile(jsonSchema, { externalDocs: { url: "not a uri" } })).rejects.toMatchObject({ messages: [{ message: "Expected a URI reference" }] });
    });

    test("xml's namespace is an absolute URI", async () => {
      await expect(compile(jsonSchema, { xml: { namespace: "/pet" } })).rejects.toMatchObject({ messages: [{ message: "Expected an absolute URI" }] });
    });

    test("their values are objects", async () => {
      await expect(compile(jsonSchema, { xml: "pet" })).rejects.toMatchObject({ messages: [{ message: "Expected an object" }] });
    });
  });
});
