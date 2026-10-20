import { describe, test, beforeEach, expect } from "vitest";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { addDraft06 } from "../draft-06/index.js";
import { addDraft07 } from "../draft-07/index.js";
import { addDraft201909 } from "../draft-2019-09/index.js";
import { addDraft202012 } from "../draft-2020-12/index.js";
import { addDraft04, draft04DialectUri } from "./index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaConfig } from "../../json-schema.d.ts"
 */

describe("draft-04", () => {
  /** @type (config?: JsonSchemaConfig) => JsonSchema */
  const draft04 = (config) => {
    const jsonSchema = new JsonSchema({ allowRetrieval: () => false, ...config });
    addDraft04(jsonSchema);
    return jsonSchema;
  };

  const $schema = `${draft04DialectUri}#`;
  const uri = "http://example.com/schema";

  /** @type (jsonSchema: JsonSchema, schema: Json) => ReturnType<JsonSchema["compile"]> */
  const compile = (jsonSchema, schema) => {
    const registry = new SchemaRegistry([{ schema, retrievalUri: uri }]);
    return jsonSchema.compile(uri, { registries: [registry] });
  };

  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = draft04();
  });

  test("it can only be added once", () => {
    expect(() => addDraft04(jsonSchema)).to.throw();
  });

  test("it can be added with every other preset", () => {
    addDraft06(jsonSchema);
    addDraft07(jsonSchema);
    addDraft201909(jsonSchema);
    addDraft202012(jsonSchema);
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

  test("unknown keywords are ignored", async () => {
    const validator = await compile(jsonSchema, { $schema, foo: "bar" });

    expect(validator.annotate(1).node.data?.annotations).to.equal(undefined);
  });

  describe("maximum and minimum", () => {
    test("are inclusive by default", async () => {
      const validator = await compile(jsonSchema, { $schema, minimum: 1, maximum: 3 });

      expect(validator.validate(1)).to.equal(true);
      expect(validator.validate(3)).to.equal(true);
      expect(validator.validate(0)).to.equal(false);
      expect(validator.validate(4)).to.equal(false);
    });

    test("are exclusive with exclusiveMinimum and exclusiveMaximum", async () => {
      const validator = await compile(jsonSchema, { $schema, minimum: 1, exclusiveMinimum: true, maximum: 3, exclusiveMaximum: true });

      expect(validator.validate(2)).to.equal(true);
      expect(validator.validate(1)).to.equal(false);
      expect(validator.validate(3)).to.equal(false);
    });

    test("are inclusive with exclusiveMinimum and exclusiveMaximum false", async () => {
      const validator = await compile(jsonSchema, { $schema, minimum: 1, exclusiveMinimum: false, maximum: 3, exclusiveMaximum: false });

      expect(validator.validate(1)).to.equal(true);
      expect(validator.validate(3)).to.equal(true);
    });

    test("exclusiveMinimum and exclusiveMaximum have no effect on their own", async () => {
      const validator = await compile(jsonSchema, { $schema, exclusiveMinimum: true, exclusiveMaximum: true });

      expect(validator.validate(1)).to.equal(true);
    });
  });

  describe("dependencies", () => {
    test("an array is properties that are required too", async () => {
      const validator = await compile(jsonSchema, { $schema, dependencies: { foo: ["bar"] } });

      expect(validator.validate({ foo: 1, bar: 2 })).to.equal(true);
      expect(validator.validate({ bar: 2 })).to.equal(true);
      expect(validator.validate({ foo: 1 })).to.equal(false);
    });

    test("a schema applies to the whole instance", async () => {
      const validator = await compile(jsonSchema, { $schema, dependencies: { foo: { required: ["bar"] } } });

      expect(validator.validate({ foo: 1, bar: 2 })).to.equal(true);
      expect(validator.validate({ foo: 1 })).to.equal(false);
    });
  });

  describe("format", () => {
    test("validates by default", async () => {
      const validator = await compile(jsonSchema, { $schema, format: "ipv4" });

      expect(validator.validate("127.0.0.1")).to.equal(true);
      expect(validator.validate("not an ip")).to.equal(false);
    });

    test("is only an annotation if the config says so", async () => {
      const validator = await compile(draft04({ validateFormats: false }), { $schema, format: "ipv4" });

      expect(validator.validate("not an ip")).to.equal(true);
    });

    test("hostname doesn't need the full formats", async () => {
      const validator = await compile(jsonSchema, { $schema, format: "hostname" });

      expect(validator.validate("example.com")).to.equal(true);
      expect(validator.validate("-invalid-")).to.equal(false);
    });

    test("a format draft-04 doesn't define is only an annotation", async () => {
      const validator = await compile(jsonSchema, { $schema, format: "uri-reference" });

      expect(validator.validate("not a uri reference")).to.equal(true);
    });
  });
});
