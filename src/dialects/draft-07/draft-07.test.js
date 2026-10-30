import { describe, test, beforeEach, expect } from "vitest";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { draft07Dialect, draft07DialectUri } from "./index.js";
import { compile as compileSchema } from "../../operations/compile.js";
import { validatorFor } from "../../operations/validate.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaConfig } from "../../json-schema.d.ts"
 * @import { CompiledSchema } from "../../operations/compile.d.ts"
 */

describe("draft-07", () => {
  /** @type (config?: JsonSchemaConfig) => JsonSchema */
  const draft07 = (config) => {
    const jsonSchema = new JsonSchema({ allowRetrieval: [], dialects: [draft07Dialect], ...config });
    return jsonSchema;
  };

  const $schema = `${draft07DialectUri}#`;
  const uri = "http://example.com/schema";

  /** @type (jsonSchema: JsonSchema, schema: Json) => Promise<CompiledSchema> */
  const compile = (jsonSchema, schema) => {
    const registry = new SchemaRegistry([{ schema, retrievalUri: uri }]);
    return compileSchema(jsonSchema, uri, { registry });
  };

  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = draft07();
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

  test("exclusiveMinimum and exclusiveMaximum are numbers", async () => {
    const compiled = await compile(jsonSchema, { $schema, exclusiveMinimum: 1, exclusiveMaximum: 3 });

    expect(validatorFor(compiled)(2)).to.equal(true);
    expect(validatorFor(compiled)(1)).to.equal(false);
    expect(validatorFor(compiled)(3)).to.equal(false);
  });

  test("format validates by default", async () => {
    const compiled = await compile(jsonSchema, { $schema, format: "ipv4" });

    expect(validatorFor(compiled)("127.0.0.1")).to.equal(true);
    expect(validatorFor(compiled)("not an ip")).to.equal(false);
  });

  test("a format draft-07 doesn't define is only an annotation", async () => {
    const compiled = await compile(jsonSchema, { $schema, format: "uuid" });

    expect(validatorFor(compiled)("not a uuid")).to.equal(true);
  });

  test("a format the dialect names without a definition is still an error", async () => {
    await expect(compile(jsonSchema, { $schema, format: "idn-hostname" })).rejects.toThrow("'formats' config");
  });

  test("format is only an annotation if the config says so", async () => {
    const compiled = await compile(draft07({ validateFormats: false }), { $schema, format: "ipv4" });

    expect(validatorFor(compiled)("not an ip")).to.equal(true);
  });

  test("if, then, and else apply", async () => {
    const compiled = await compile(jsonSchema, { $schema, if: { type: "string" }, then: { minLength: 2 }, else: { minimum: 2 } });

    expect(validatorFor(compiled)("ab")).to.equal(true);
    expect(validatorFor(compiled)("a")).to.equal(false);
    expect(validatorFor(compiled)(2)).to.equal(true);
    expect(validatorFor(compiled)(1)).to.equal(false);
  });
});
