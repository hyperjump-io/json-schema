import { describe, test, beforeEach, expect } from "vitest";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { addDraft202012, draft202012DialectUri } from "../draft-2020-12/index.js";
import { addDraft201909, draft201909DialectUri } from "./index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaConfig } from "../../json-schema.d.ts"
 */

describe("draft-2019-09", () => {
  /** @type (config?: JsonSchemaConfig) => JsonSchema */
  const draft201909 = (config) => {
    const jsonSchema = new JsonSchema({ allowRetrieval: [], ...config });
    addDraft201909(jsonSchema);
    return jsonSchema;
  };

  /** @type (jsonSchema: JsonSchema, schemas: Json[], uri: string) => ReturnType<JsonSchema["compile"]> */
  const compile = (jsonSchema, schemas, uri) => {
    const registry = new SchemaRegistry(schemas.map((schema) => ({ schema })));
    return jsonSchema.compile(uri, { registry });
  };

  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = draft201909();
  });

  test("it can only be added once", () => {
    expect(() => addDraft201909(jsonSchema)).to.throw();
  });

  test("it can be added with 2020-12", async () => {
    addDraft202012(jsonSchema);
    const uri = "https://example.com/both";
    const validator = await compile(jsonSchema, [
      { $schema: draft201909DialectUri, $id: uri, items: [{ type: "string" }], additionalItems: { $ref: "2020-12" } },
      { $schema: draft202012DialectUri, $id: "https://example.com/2020-12", prefixItems: [{ type: "number" }] }
    ], uri);

    // `prefixItems` is only a keyword in the 2020-12 schema
    expect(validator.validate(["a", [1]])).to.equal(true);
    expect(validator.validate(["a", ["b"]])).to.equal(false);
  });

  test("$anchor allows the names 2019-09 allows", async () => {
    const uri = "https://example.com/anchor";
    const validator = await compile(jsonSchema, [
      { $schema: draft201909DialectUri, $id: uri, $ref: "#a:b", $defs: { foo: { $anchor: "a:b", type: "string" } } }
    ], uri);

    expect(validator.validate("foo")).to.equal(true);
    expect(validator.validate(1)).to.equal(false);
  });

  describe("format", () => {
    const uri = "https://example.com/format";
    const schema = { $schema: draft201909DialectUri, $id: uri, format: "date" };

    test("is an annotation by default", async () => {
      const validator = await compile(jsonSchema, [schema], uri);

      expect(validator.validate("not a date")).to.equal(true);
    });

    test("validates if the config says so", async () => {
      const validator = await compile(draft201909({ validateFormats: true }), [schema], uri);

      expect(validator.validate("2026-10-17")).to.equal(true);
      expect(validator.validate("not a date")).to.equal(false);
    });
  });
});
