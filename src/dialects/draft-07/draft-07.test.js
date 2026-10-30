import { describe, test, beforeEach, expect } from "vitest";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { draft07Dialect, draft07DialectUri } from "./index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaConfig } from "../../json-schema.d.ts"
 */

describe("draft-07", () => {
  /** @type (config?: JsonSchemaConfig) => JsonSchema */
  const draft07 = (config) => {
    const jsonSchema = new JsonSchema({ allowRetrieval: [], dialects: [draft07Dialect], ...config });
    return jsonSchema;
  };

  const $schema = `${draft07DialectUri}#`;
  const uri = "http://example.com/schema";

  /** @type (jsonSchema: JsonSchema, schema: Json) => ReturnType<JsonSchema["compile"]> */
  const compile = (jsonSchema, schema) => {
    const registry = new SchemaRegistry([{ schema, retrievalUri: uri }]);
    return jsonSchema.compile(uri, { registry });
  };

  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = draft07();
  });

  test("$ref replaces the whole schema", async () => {
    const validator = await compile(jsonSchema, {
      $schema,
      definitions: { string: { type: "string" } },
      properties: { foo: { $ref: "#/definitions/string", maxLength: 1 } }
    });

    expect(validator.validate({ foo: "long" })).to.equal(true);
    expect(validator.validate({ foo: 1 })).to.equal(false);
  });

  test("exclusiveMinimum and exclusiveMaximum are numbers", async () => {
    const validator = await compile(jsonSchema, { $schema, exclusiveMinimum: 1, exclusiveMaximum: 3 });

    expect(validator.validate(2)).to.equal(true);
    expect(validator.validate(1)).to.equal(false);
    expect(validator.validate(3)).to.equal(false);
  });

  test("format validates by default", async () => {
    const validator = await compile(jsonSchema, { $schema, format: "ipv4" });

    expect(validator.validate("127.0.0.1")).to.equal(true);
    expect(validator.validate("not an ip")).to.equal(false);
  });

  test("a format draft-07 doesn't define is only an annotation", async () => {
    const validator = await compile(jsonSchema, { $schema, format: "uuid" });

    expect(validator.validate("not a uuid")).to.equal(true);
  });

  test("a format the dialect names without a definition is still an error", async () => {
    await expect(compile(jsonSchema, { $schema, format: "idn-hostname" })).rejects.toThrow("'formats' config");
  });

  test("format is only an annotation if the config says so", async () => {
    const validator = await compile(draft07({ validateFormats: false }), { $schema, format: "ipv4" });

    expect(validator.validate("not an ip")).to.equal(true);
  });

  test("if, then, and else apply", async () => {
    const validator = await compile(jsonSchema, { $schema, if: { type: "string" }, then: { minLength: 2 }, else: { minimum: 2 } });

    expect(validator.validate("ab")).to.equal(true);
    expect(validator.validate("a")).to.equal(false);
    expect(validator.validate(2)).to.equal(true);
    expect(validator.validate(1)).to.equal(false);
  });
});
