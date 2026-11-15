import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { jsonSchemaMediaTypes } from "../json-schema.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { BASIC, DETAILED } from "../output/index.js";
import { compile } from "../operations/compile.js";
import { annotatorFor, validatorFor } from "../operations/validate-compiled.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { OutputError } from "../output/output-format.d.ts"
 * @import { DetailedValidationError } from "../output/validation-error.d.ts"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 */

/**
 * The JSON-Schema-Test-Suite only checks whether an instance is valid. These
 * check the errors that are reported.
 */
describe("applicator errors", () => {
  /** @type JsonSchemaConfig */
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
    jsonSchema = {
      mediaTypes: jsonSchemaMediaTypes({ dialects: [v1Dialect] }),
      allowRetrieval: [pathToFileURL(join(tmpdir(), "/")).href]
    };
  });

  afterAll(async () => {
    await rm(directory, { recursive: true });
  });

  describe("if", () => {
    /** @type Record<string, Json> */
    const schema = { if: { type: "string" }, then: { maxLength: 2 }, else: { minimum: 10 } };

    test("then has its own keyword location", async () => {
      const compiled = await compile(jsonSchema, await schemaFile(schema));

      expect(validatorFor(compiled, { output: BASIC })("abc").errors.map(keywordPointers)).to.eql(["/then/maxLength"]);
      expect(validatorFor(compiled, { output: DETAILED })("abc").errors.map(keywordPointers)).to.eql([
        { "/if": ["/then/maxLength"] }
      ]);
    });

    test("a failing condition isn't an error", async () => {
      const compiled = await compile(jsonSchema, await schemaFile(schema));

      expect(validatorFor(compiled, { output: BASIC })(5).errors.map(keywordPointers)).to.eql(["/else/minimum"]);
      expect(validatorFor(compiled, { output: DETAILED })(5).errors.map(keywordPointers)).to.eql([
        { "/if": ["/else/minimum"] }
      ]);
    });

    test("DETAILED gives if's errors as a plain array", async () => {
      const compiled = await compile(jsonSchema, await schemaFile(schema));

      const [error] = validatorFor(compiled, { output: DETAILED })("abc").errors;
      expect(Object.keys(/** @type DetailedValidationError */ (error).errors ?? {})).to.eql(["0"]);
    });
  });

  describe("$ref", () => {
    test("errors follow the reference", async () => {
      const compiled = await compile(jsonSchema, await schemaFile({
        properties: { foo: { $ref: "#/$defs/number" } },
        $defs: { number: { type: "number" } }
      }));

      expect(validatorFor(compiled, { output: BASIC })({ foo: "x" }).errors.map(locations)).to.eql([
        { absoluteKeywordLocation: "#/$defs/number/type", instanceLocation: "/foo" }
      ]);
    });
  });

  describe("$dynamicRef", () => {
    test("errors follow the dynamic reference", async () => {
      const compiled = await compile(jsonSchema, await schemaFile({
        items: { $dynamicRef: "item" },
        $defs: { item: { $dynamicAnchor: "item", type: "string" } }
      }));

      expect(validatorFor(compiled, { output: BASIC })([1]).errors.map(locations)).to.eql([
        { absoluteKeywordLocation: "#/$defs/item/type", instanceLocation: "/0" }
      ]);
    });

    test("a dynamic anchor that isn't in scope", async () => {
      const compiled = await compile(jsonSchema, await schemaFile({ $dynamicRef: "nope" }));

      expect(() => validatorFor(compiled)(1)).to.throw("No 'nope' dynamic anchor");
    });
  });

  describe("unevaluatedProperties", () => {
    test("errors are for the unevaluated properties", async () => {
      const compiled = await compile(jsonSchema, await schemaFile({
        allOf: [{ properties: { foo: true } }],
        unevaluatedProperties: false
      }));

      expect(validatorFor(compiled, { output: BASIC })({ foo: 1, bar: 2 }).errors.map(locations)).to.eql([
        { absoluteKeywordLocation: "#/unevaluatedProperties", instanceLocation: "/bar" }
      ]);
    });
  });

  describe("unevaluatedItems", () => {
    test("errors are for the unevaluated items", async () => {
      const compiled = await compile(jsonSchema, await schemaFile({
        prefixItems: [true],
        unevaluatedItems: { type: "string" }
      }));

      expect(validatorFor(compiled, { output: BASIC })([1, 2]).errors.map(locations)).to.eql([
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
      const compiled = await compile(jsonSchema, await schemaFile(schema));

      expect(validatorFor(compiled, { output: BASIC })(5).errors.map(keywordPointers)).to.eql([
        "/conditional/2/1/minimum"
      ]);
    });

    test("the fallback's errors are errors", async () => {
      const compiled = await compile(jsonSchema, await schemaFile(schema));

      expect(validatorFor(compiled, { output: BASIC })(true).errors.map(keywordPointers)).to.eql([
        "/conditional/3/const"
      ]);
    });
  });

  describe("anyOf and oneOf", () => {
    test("of one schema, only its errors are errors", async () => {
      const compiled = await compile(jsonSchema, await schemaFile({
        anyOf: [{ type: "string" }],
        oneOf: [{ minimum: 10 }]
      }));

      expect(validatorFor(compiled, { output: BASIC })(5).errors.map(keywordPointers)).to.eql([
        "/anyOf/0/type",
        "/oneOf/0/minimum"
      ]);
    });

    test("of more schemas, they're errors too", async () => {
      const compiled = await compile(jsonSchema, await schemaFile({
        anyOf: [{ type: "string", minLength: 1 }, { type: "boolean" }],
        oneOf: [{ minimum: 10 }, { maximum: 0 }]
      }));

      expect(validatorFor(compiled, { output: BASIC })(5).errors.map(keywordPointers)).to.eql([
        "/anyOf",
        "/anyOf/0/type",
        "/anyOf/1/type",
        "/oneOf",
        "/oneOf/0/minimum",
        "/oneOf/1/maximum"
      ]);
    });
  });

  describe("propertyNames", () => {
    test("a property name has the object's instance location", async () => {
      const compiled = await compile(jsonSchema, await schemaFile({ properties: { foo: { propertyNames: { maxLength: 2 } } } }));

      const json = `{ "foo": { "bar": 1 } }`;
      for (const result of [validatorFor(compiled, { output: BASIC })(JSON.parse(json)), validatorFor(compiled, { input: "json", output: BASIC })(json)]) {
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
      const compiled = await compile(jsonSchema, await schemaFile(schema));

      expect(validatorFor(compiled)({ "foo": "a", "bar": 1, "x-a": 1, "baz": null })).to.equal(true);
      expect(validatorFor(compiled)({ foo: "a", bar: "1" })).to.equal(false);
      expect(validatorFor(compiled, { input: "json" })(`{ "foo": "a", "bar": "1" }`)).to.equal(false);
      expect(validatorFor(compiled)([1, "a"])).to.equal(true);
    });

    test("still mark what they evaluate", async () => {
      const compiled = await compile(jsonSchema, await schemaFile({
        patternProperties: { "^x-": true },
        unevaluatedProperties: false
      }));

      expect(validatorFor(compiled)({ "x-a": 1 })).to.equal(true);
      expect(validatorFor(compiled)({ "x-a": 1, "foo": 1 })).to.equal(false);
    });

    test("still annotate", async () => {
      const compiled = await compile(jsonSchema, await schemaFile(schema));

      const { node } = annotatorFor(compiled)({ "x-a": 1 });
      const property = /** @type any */ (node).children[0].children[1];
      expect(property.data.annotations.get("https://json-schema.org/keyword/description")).to.eql(["An extension"]);
    });

    test("still annotate for plugins that see annotations", async () => {
      const compiled = await compile(jsonSchema, await schemaFile(schema));

      /** @type [string, Json][] */
      const annotations = [];
      const valid = validatorFor(compiled, {
        plugins: [{
          annotation: (keyword, _at, value) => annotations.push([pointer(keyword.absoluteKeywordLocation), value])
        }]
      })({ "foo": 1, "x-a": 1 });
      expect(valid).to.equal(true);
      expect(annotations).to.include.deep.members([["/patternProperties/^x-/description", "An extension"], ["/allOf/1/title", "Always"]]);
    });
  });
});

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
