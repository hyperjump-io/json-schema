import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { addV1, v1DialectUri } from "../v1/index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { DetailedValidationError, OutputError } from "../json-schema.d.ts"
 */

/** @type (error: OutputError) => unknown */
const locations = (error) => {
  const { keywordLocation, absoluteKeywordLocation, instanceLocation } = /** @type DetailedValidationError */ (error);
  return { keywordLocation, absoluteKeywordLocation: absoluteKeywordLocation.replace(/.*#/, "#"), instanceLocation };
};

/** @type (error: OutputError) => unknown */
const keywordLocations = (error) => {
  const errors = /** @type DetailedValidationError */ (error).errors;
  return errors === undefined
    ? /** @type DetailedValidationError */ (error).keywordLocation
    : { [/** @type DetailedValidationError */ (error).keywordLocation]: errors.map(keywordLocations) };
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
    directory = await mkdtemp(join(tmpdir(), "json-schema-next-"));
    jsonSchema = new JsonSchema();
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

      expect(validator.validate("abc", { output: "BASIC" }).errors.map(keywordLocations)).to.eql(["/then/maxLength"]);
      expect(validator.validate("abc", { output: "DETAILED" }).errors.map(keywordLocations)).to.eql([
        { "/if": ["/then/maxLength"] }
      ]);
    });

    test("a failing condition isn't an error", async () => {
      const validator = await jsonSchema.compile(await schemaFile(schema));

      expect(validator.validate(5, { output: "BASIC" }).errors.map(keywordLocations)).to.eql(["/else/minimum"]);
      expect(validator.validate(5, { output: "DETAILED" }).errors.map(keywordLocations)).to.eql([
        { "/if": ["/else/minimum"] }
      ]);
    });
  });

  describe("$ref", () => {
    test("errors follow the reference", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { foo: { $ref: "#/$defs/number" } },
        $defs: { number: { type: "number" } }
      }));

      expect(validator.validate({ foo: "x" }, { output: "BASIC" }).errors.map(locations)).to.eql([
        { keywordLocation: "/properties/foo/$ref/type", absoluteKeywordLocation: "#/$defs/number/type", instanceLocation: "/foo" }
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
        { keywordLocation: "/items/$dynamicRef/type", absoluteKeywordLocation: "#/$defs/item/type", instanceLocation: "/0" }
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
        { keywordLocation: "/unevaluatedProperties", absoluteKeywordLocation: "#/unevaluatedProperties", instanceLocation: "/bar" }
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
        { keywordLocation: "/unevaluatedItems/type", absoluteKeywordLocation: "#/unevaluatedItems/type", instanceLocation: "/1" }
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

      expect(validator.validate(5, { output: "BASIC" }).errors.map(keywordLocations)).to.eql([
        "/conditional",
        "/conditional/2/1/minimum"
      ]);
    });

    test("the fallback's errors are errors", async () => {
      const validator = await jsonSchema.compile(await schemaFile(schema));

      expect(validator.validate(true, { output: "BASIC" }).errors.map(keywordLocations)).to.eql([
        "/conditional",
        "/conditional/3/const"
      ]);
    });
  });
});
