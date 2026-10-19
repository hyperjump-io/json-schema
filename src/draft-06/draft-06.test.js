import { describe, test, beforeEach, expect } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { SchemaRegistry } from "../schema-registry.js";
import { addDraft06, draft06DialectUri } from "./index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 */

describe("draft-06", () => {
  /** @type (config?: JsonSchemaConfig) => JsonSchema */
  const draft06 = (config) => {
    const jsonSchema = new JsonSchema(config);
    jsonSchema.removeUriSchemePlugin("http");
    jsonSchema.removeUriSchemePlugin("https");
    addDraft06(jsonSchema);
    return jsonSchema;
  };

  const $schema = `${draft06DialectUri}#`;
  const uri = "http://example.com/schema";

  /** @type (jsonSchema: JsonSchema, schema: Json) => ReturnType<JsonSchema["compile"]> */
  const compile = (jsonSchema, schema) => {
    const registry = new SchemaRegistry([{ schema, retrievalUri: uri }]);
    return jsonSchema.compile(uri, { registries: [registry] });
  };

  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = draft06();
  });

  test("it can only be added once", () => {
    expect(() => addDraft06(jsonSchema)).to.throw();
  });

  test("the meta-schema is available without retrieving it", async () => {
    const validator = await jsonSchema.compile($schema);

    expect(validator.validate({ type: "string", minLength: 1 })).to.equal(true);
    expect(validator.validate({ minLength: -1 })).to.equal(false);
    expect(validator.validate({ properties: { foo: { type: 1 } } })).to.equal(false);
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

  test("format is only an annotation if the config says so", async () => {
    const validator = await compile(draft06({ validateFormats: false }), { $schema, format: "ipv4" });

    expect(validator.validate("not an ip")).to.equal(true);
  });

  test("if, then, and else are unknown keywords, so they're ignored", async () => {
    const validator = await compile(jsonSchema, { $schema, if: true, then: false });

    expect(validator.validate(1)).to.equal(true);
  });
});
