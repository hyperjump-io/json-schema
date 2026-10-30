import { describe, test, beforeEach, expect } from "vitest";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { draft06Dialect, draft06DialectUri } from "./index.js";
import { compile as compileSchema } from "../../operations/compile.js";
import { validatorFor } from "../../operations/validate-compiled.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaConfig } from "../../json-schema.d.ts"
 * @import { CompiledSchema } from "../../operations/compile.d.ts"
 */

describe("draft-06", () => {
  /** @type (config?: JsonSchemaConfig) => JsonSchema */
  const draft06 = (config) => {
    const jsonSchema = new JsonSchema({ allowRetrieval: [], dialects: [draft06Dialect], ...config });
    return jsonSchema;
  };

  const $schema = `${draft06DialectUri}#`;
  const uri = "http://example.com/schema";

  /** @type (jsonSchema: JsonSchema, schema: Json) => Promise<CompiledSchema> */
  const compile = (jsonSchema, schema) => {
    const registry = new SchemaRegistry([{ schema, retrievalUri: uri }]);
    return compileSchema(jsonSchema, uri, { registry });
  };

  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = draft06();
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

  test("format is only an annotation if the config says so", async () => {
    const compiled = await compile(draft06({ validateFormats: false }), { $schema, format: "ipv4" });

    expect(validatorFor(compiled)("not an ip")).to.equal(true);
  });

  test("if, then, and else are unknown keywords, so they're ignored", async () => {
    const compiled = await compile(jsonSchema, { $schema, if: true, then: false });

    expect(validatorFor(compiled)(1)).to.equal(true);
  });
});
