import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { addV1, v1DialectUri } from "../dialects/v1/index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { OutputError } from "../output/output-format.d.ts"
 * @import { DetailedValidationError } from "../output/validation-error.d.ts"
 */

/**
 * The JSON Pointer in a location's fragment. The schemas these tests use are
 * single documents, so it identifies the keyword.
 *
 * @type (uri: string) => string
 */
const pointer = (uri) => decodeURIComponent(uri.replace(/.*#/, ""));

/** @type (error: OutputError) => unknown */
const locations = (error) => {
  const { absoluteKeywordLocation, instanceLocation } = /** @type DetailedValidationError */ (error);
  return { absoluteKeywordLocation: absoluteKeywordLocation.replace(/.*#/, "#"), instanceLocation };
};

/** @type (error: OutputError) => unknown */
const keywordPointers = (error) => {
  const { absoluteKeywordLocation, errors } = /** @type DetailedValidationError */ (error);
  return errors === undefined
    ? pointer(absoluteKeywordLocation)
    : { [pointer(absoluteKeywordLocation)]: errors.map(keywordPointers) };
};

/**
 * The JSON-Schema-Test-Suite only checks whether an instance is valid. These
 * check the errors that are reported.
 */
describe("applicator errors", () => {
  /** @type JsonSchema */
  let jsonSchema;

  /** @type string */
  let directory;
  let fileCount = 0;

  /** @type (schema: Record<string, Json>) => Promise<string> */
  const schemaFile = async (schema) => {
    const path = join(directory, `${fileCount++}.schema.json`);
    await writeFile(path, JSON.stringify({ $schema: v1DialectUri, ...schema }));
    return pathToFileURL(path).toString();
  };

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "json-schema-"));
    jsonSchema = new JsonSchema({ allowRetrieval: () => true });
    addV1(jsonSchema);
  });

  afterAll(async () => {
    await rm(directory, { recursive: true });
  });

  describe("if", () => {
    /** @type Record<string, Json> */
    const schema = { if: { type: "string" }, then: { maxLength: 2 }, else: { minimum: 10 } };

    test("then has its own keyword location", async () => {
      const validator = await jsonSchema.compile(await schemaFile(schema));

      expect(validator.validate("abc", { output: "BASIC" }).errors.map(keywordPointers)).to.eql(["/then/maxLength"]);
      expect(validator.validate("abc", { output: "DETAILED" }).errors.map(keywordPointers)).to.eql([
        { "/if": ["/then/maxLength"] }
      ]);
    });

    test("a failing condition isn't an error", async () => {
      const validator = await jsonSchema.compile(await schemaFile(schema));

      expect(validator.validate(5, { output: "BASIC" }).errors.map(keywordPointers)).to.eql(["/else/minimum"]);
      expect(validator.validate(5, { output: "DETAILED" }).errors.map(keywordPointers)).to.eql([
        { "/if": ["/else/minimum"] }
      ]);
    });

    test("DETAILED gives if's errors as a plain array", async () => {
      const validator = await jsonSchema.compile(await schemaFile(schema));

      const [error] = validator.validate("abc", { output: "DETAILED" }).errors;
      expect(Object.keys(/** @type DetailedValidationError */ (error).errors ?? {})).to.eql(["0"]);
    });
  });

  describe("$ref", () => {
    test("errors follow the reference", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { foo: { $ref: "#/$defs/number" } },
        $defs: { number: { type: "number" } }
      }));

      expect(validator.validate({ foo: "x" }, { output: "BASIC" }).errors.map(locations)).to.eql([
        { absoluteKeywordLocation: "#/$defs/number/type", instanceLocation: "/foo" }
      ]);
    });
  });

  describe("$dynamicRef", () => {
    test("errors follow the dynamic reference", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        items: { $dynamicRef: "item" },
        $defs: { item: { $dynamicAnchor: "item", type: "string" } }
      }));

      expect(validator.validate([1], { output: "BASIC" }).errors.map(locations)).to.eql([
        { absoluteKeywordLocation: "#/$defs/item/type", instanceLocation: "/0" }
      ]);
    });

    test("a dynamic anchor that isn't in scope", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ $dynamicRef: "nope" }));

      expect(() => validator.validate(1)).to.throw("No 'nope' dynamic anchor");
    });
  });

  describe("unevaluatedProperties", () => {
    test("errors are for the unevaluated properties", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        allOf: [{ properties: { foo: true } }],
        unevaluatedProperties: false
      }));

      expect(validator.validate({ foo: 1, bar: 2 }, { output: "BASIC" }).errors.map(locations)).to.eql([
        { absoluteKeywordLocation: "#/unevaluatedProperties", instanceLocation: "/bar" }
      ]);
    });
  });

  describe("unevaluatedItems", () => {
    test("errors are for the unevaluated items", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        prefixItems: [true],
        unevaluatedItems: { type: "string" }
      }));

      expect(validator.validate([1, 2], { output: "BASIC" }).errors.map(locations)).to.eql([
        { absoluteKeywordLocation: "#/unevaluatedItems/type", instanceLocation: "/1" }
      ]);
    });
  });

  describe("conditional", () => {
    /** @type Record<string, Json> */
    const schema = {
      conditional: [
        { type: "string" }, { maxLength: 2 },
        [{ type: "number" }, { minimum: 10 }],
        { const: null }
      ]
    };

    test("failing conditions aren't errors", async () => {
      const validator = await jsonSchema.compile(await schemaFile(schema));

      expect(validator.validate(5, { output: "BASIC" }).errors.map(keywordPointers)).to.eql([
        "/conditional",
        "/conditional/2/1/minimum"
      ]);
    });

    test("the fallback's errors are errors", async () => {
      const validator = await jsonSchema.compile(await schemaFile(schema));

      expect(validator.validate(true, { output: "BASIC" }).errors.map(keywordPointers)).to.eql([
        "/conditional",
        "/conditional/3/const"
      ]);
    });
  });

  describe("propertyNames", () => {
    test("a property name has the object's instance location", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { propertyNames: { maxLength: 2 } } } }));

      const json = `{ "foo": { "bar": 1 } }`;
      for (const result of [validator.validate(JSON.parse(json), { output: "BASIC" }), validator.validateJson(json, { output: "BASIC" })]) {
        expect(result.errors.map(locations)).to.eql([
          { absoluteKeywordLocation: "#/properties/foo/propertyNames/maxLength", instanceLocation: "/foo" }
        ]);
      }
    });
  });

  describe("subschemas that always pass", () => {
    /** @type Record<string, Json> */
    const schema = {
      properties: { foo: {}, bar: { type: "number" } },
      patternProperties: { "^x-": { description: "An extension" } },
      additionalProperties: true,
      allOf: [true, { title: "Always" }],
      anyOf: [{ type: "object" }, {}],
      items: {}
    };

    test("are left out without changing the result", async () => {
      const validator = await jsonSchema.compile(await schemaFile(schema));

      expect(validator.validate({ "foo": "a", "bar": 1, "x-a": 1, "baz": null })).to.equal(true);
      expect(validator.validate({ foo: "a", bar: "1" })).to.equal(false);
      expect(validator.validateJson(`{ "foo": "a", "bar": "1" }`)).to.equal(false);
      expect(validator.validate([1, "a"])).to.equal(true);
    });

    test("still mark what they evaluate", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        patternProperties: { "^x-": true },
        unevaluatedProperties: false
      }));

      expect(validator.validate({ "x-a": 1 })).to.equal(true);
      expect(validator.validate({ "x-a": 1, "foo": 1 })).to.equal(false);
    });

    test("still annotate", async () => {
      const validator = await jsonSchema.compile(await schemaFile(schema));

      const { node } = validator.annotate({ "x-a": 1 });
      const property = /** @type any */ (node).children[0].children[1];
      expect(property.data.annotations.get("https://json-schema.org/keyword/description")).to.eql(["An extension"]);
    });

    test("are still seen by plugins", async () => {
      const validator = await jsonSchema.compile(await schemaFile(schema));

      /** @type string[] */
      const locations = [];
      validator.validate({ "foo": 1, "x-a": 1 }, {
        plugins: [{
          afterSchema: (schema) => locations.push(pointer(schema.absoluteKeywordLocation)),
          afterKeyword: (keyword) => locations.push(pointer(keyword.absoluteKeywordLocation))
        }]
      });
      expect(locations).to.include.members(["/properties/foo", "/allOf/0", "/patternProperties/^x-/description", "/allOf/1/title"]);
    });
  });
});
