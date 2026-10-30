import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, test, beforeEach, beforeAll, afterAll, expect } from "vitest";
import { VFileMessage } from "vfile-message";
import { fromJson, pointerGet } from "@hyperjump/browser/json";
import { JsonSchema, outputErrorMessage, toVFileMessage } from "../json-schema.js";
import idKeyword from "../keywords/id.js";
import anchorKeyword from "../keywords/anchor.js";
import dynamicAnchorKeyword from "../keywords/dynamicAnchor.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { EvaluateContext, Keyword, OpaqueContext, Reference } from "../keyword.d.ts"
 * @import { Expression, TypeName } from "./kernel.d.ts"
 * @import { EvaluationLocation, EvaluationPlugin } from "./evaluation-plugin.d.ts"
 * @import { DetailedValidationError, ValidationError } from "../output/validation-error.d.ts"
 * @import { DialectConfig } from "../dialect.d.ts"
 */

const dialectUri = "https://example.com/dialect";

/** @type Keyword<TypeName | TypeName[]> */
const typeKeyword = {
  uri: "https://example.com/keyword/type",
  shape: "data",
  lower: (type) => ({ op: "typeIs", types: Array.isArray(type) ? type : [type] })
};

/** @type Keyword<number> */
const minimumKeyword = {
  uri: "https://example.com/keyword/minimum",
  shape: "data",
  lower: (min) => ({ op: "range", min })
};

/** @type Keyword<string> */
const titleKeyword = {
  uri: "https://example.com/keyword/title",
  shape: "data",
  lower: (value) => ({ op: "annotate", value })
};

/** @type Keyword<[string, Expression][]> */
const propertiesKeyword = {
  uri: "https://example.com/keyword/properties",
  shape: { map: "schema" },
  lower: (pairs) => ({ op: "all", of: pairs.map(([name, schema]) => ({ op: "property", name, of: schema })) })
};

/** @type Keyword<[string, Expression][]> */
const patternPropertiesKeyword = {
  uri: "https://example.com/keyword/patternProperties",
  shape: { map: "schema" },
  lower: (pairs) => ({ op: "all", of: pairs.map(([pattern, schema]) => ({ op: "eachProperty", select: { pattern }, of: schema })) })
};

/** @type Keyword<Expression, "schema", { properties?: [string, Expression][]; patternProperties?: [string, Expression][] }> */
const additionalPropertiesKeyword = {
  uri: "https://example.com/keyword/additionalProperties",
  siblings: { properties: "https://example.com/keyword/properties", patternProperties: "https://example.com/keyword/patternProperties" },
  shape: "schema",
  lower: (schema, { properties = [], patternProperties = [] }) => ({
    op: "eachProperty",
    select: { except: { names: properties.map(([name]) => name), patterns: patternProperties.map(([pattern]) => pattern) } },
    of: schema
  })
};

/** @type Keyword<string[]> */
const requiredKeyword = {
  uri: "https://example.com/keyword/required",
  shape: "data",
  lower: (names) => ({ op: "all", of: names.map((name) => ({ op: "hasProperty", name })) })
};

/** @type Keyword<Expression> */
const itemsKeyword = {
  uri: "https://example.com/keyword/items",
  shape: "schema",
  lower: (schema) => ({ op: "eachItem", from: 0, of: schema })
};

/** @type Keyword<number> */
const minItemsKeyword = {
  uri: "https://example.com/keyword/minItems",
  shape: "data",
  lower: (min) => ({ op: "itemCount", min })
};

/** @type Keyword<boolean> */
const uniqueItemsKeyword = {
  uri: "https://example.com/keyword/uniqueItems",
  shape: "data",
  lower: (unique) => unique ? { op: "uniqueItems" } : { op: "pass" }
};

/** @type Keyword<Expression[]> */
const allOfKeyword = {
  uri: "https://example.com/keyword/allOf",
  shape: { array: "schema" },
  lower: (schemas) => ({ op: "all", of: schemas })
};

/** @type Keyword<Expression[]> */
const anyOfKeyword = {
  uri: "https://example.com/keyword/anyOf",
  shape: { array: "schema" },
  lower: (schemas) => ({ op: "any", of: schemas })
};

/** @type Keyword<Reference> */
const refKeyword = {
  uri: "https://example.com/keyword/ref",
  shape: "reference",
  lower: (reference) => reference.schema
};

// The outermost schema in the dynamic scope with the fragment's dynamic
// anchor, or the schema it resolves to
/** @type Keyword<Reference> */
const dynamicRefKeyword = {
  uri: "https://example.com/keyword/dynamicRef",
  shape: "reference",
  lower: ({ uri, handle }) => ({ op: "dynamicApply", anchor: uri.slice(uri.indexOf("#") + 1), fallback: handle })
};

/** @type Keyword<Expression, "schema", { then?: Expression }> */
const ifKeyword = {
  uri: "https://example.com/keyword/if",
  shape: "schema",
  siblings: { then: "https://example.com/keyword/then" },
  lower: (schema, { then }) => ({ op: "cases", cases: [[schema, then ?? null]], otherwise: null })
};

/** @type Keyword<Expression> */
const unevaluatedPropertiesKeyword = {
  uri: "https://example.com/keyword/unevaluatedProperties",
  shape: "schema",
  lower: (schema) => ({ op: "eachProperty", select: { unevaluated: true }, of: schema })
};

/** @type Keyword<Expression> */
const unevaluatedItemsKeyword = {
  uri: "https://example.com/keyword/unevaluatedItems",
  shape: "schema",
  lower: (schema) => ({ op: "eachItem", unevaluated: true, of: schema })
};

// Whether an array's numbers are in order. The kernel can't say it, so it's
// a predicate.
/** @type Keyword<"ascending" | "descending"> */
const sortedKeyword = {
  uri: "https://example.com/keyword/sorted",
  shape: "data",
  lower: (order) => ({ op: "predicate", keyword: "https://example.com/keyword/sorted", value: order, types: ["array"] }),
  evaluate: (order, { instance }) => {
    const sign = order === "ascending" ? 1 : -1;
    return (array) => {
      /** @type number | undefined */
      let previous;
      for (const item of instance.items(array)) {
        const value = /** @type number */ (instance.value(item));
        if (previous !== undefined && sign * (value - previous) < 0) {
          return false;
        }
        previous = value;
      }
      return true;
    };
  }
};

// Applies a schema to each property value by its type, and annotates the
// names it applied one to. The kernel could say it, but it's a test of
// `opaque`.
/** @type Keyword<[string, Expression][]> */
const propertiesByTypeKeyword = {
  uri: "https://example.com/keyword/propertiesByType",
  shape: { map: "schema" },
  lower: (pairs) => ({
    op: "opaque",
    keyword: "https://example.com/keyword/propertiesByType",
    value: pairs.map(([type]) => type),
    schemas: pairs.map(([, schema]) => schema),
    explainsFailure: true
  }),
  evaluate: (types, context) => {
    const { instance, schemas, markEvaluated, annotate, exhaustive } = opaqueContext(context);
    const evaluators = new Map(/** @type string[] */ (types).map((type, index) => [type, schemas[index]]));
    return (object) => {
      if (instance.typeOf(object) !== "object") {
        return true;
      }

      let valid = true;
      /** @type string[] */
      const names = [];
      for (const [name, value] of instance.entries(object)) {
        const evaluate = evaluators.get(/** @type string */ (instance.typeOf(value)));
        if (evaluate !== undefined) {
          valid = evaluate(value, name) && valid;
          if (!valid && !exhaustive) {
            return false;
          }
          markEvaluated(name);
          names.push(name);
        }
      }
      annotate?.(names);
      return valid;
    };
  }
};

// Applies schemas to the instance, in order, until one passes
/** @type Keyword<Expression[]> */
const firstOfKeyword = {
  uri: "https://example.com/keyword/firstOf",
  shape: { array: "schema" },
  lower: (schemas) => ({ op: "opaque", keyword: "https://example.com/keyword/firstOf", value: null, schemas }),
  evaluate: (_value, context) => {
    const { schemas } = opaqueContext(context);
    return (instance) => schemas.some((evaluate) => evaluate(instance));
  }
};

// `firstOf` of objects of property schemas, so what it applies isn't
// `apply`
/** @type Keyword<[string, Expression][][]> */
const firstOfPropertiesKeyword = {
  uri: "https://example.com/keyword/firstOfProperties",
  shape: { array: { map: "schema" } },
  lower: (alternatives) => ({
    op: "opaque",
    keyword: "https://example.com/keyword/firstOf",
    value: null,
    schemas: alternatives.map((pairs) => ({ op: "all", of: pairs.map(([name, schema]) => ({ op: "property", name, of: schema })) }))
  })
};

// Whether the instance is the value. It's `const` as an opaque operation,
// to show the value is only data.
/** @type Keyword<Json> */
const sameAsKeyword = {
  uri: "https://example.com/keyword/sameAs",
  shape: "data",
  lower: (value) => ({ op: "opaque", keyword: "https://example.com/keyword/sameAs", value, schemas: [] }),
  evaluate: (value, context) => {
    const { instance } = opaqueContext(context);
    return (subject) => JSON.stringify(instance.value(subject)) === JSON.stringify(value);
  }
};

// At most this many properties aren't evaluated by the keyword's siblings
/** @type Keyword<number> */
const maxUnevaluatedKeyword = {
  uri: "https://example.com/keyword/maxUnevaluated",
  shape: "data",
  lower: (max) => ({ op: "opaque", keyword: "https://example.com/keyword/maxUnevaluated", value: max, schemas: [], reads: ["evaluated"] }),
  evaluate: (max, context) => {
    const { instance, evaluated } = opaqueContext(context);
    return (object) => {
      if (instance.typeOf(object) !== "object") {
        return true;
      }

      const marked = /** @type NonNullable<typeof evaluated> */ (evaluated)();
      let count = 0;
      for (const [name] of instance.entries(object)) {
        if (!marked.has(name)) {
          count++;
        }
      }
      return count <= /** @type number */ (max);
    };
  }
};

// Applies the outermost schema in the dynamic scope with a dynamic anchor to
// each property value
/** @type Keyword<string> */
const dynamicPropertiesKeyword = {
  uri: "https://example.com/keyword/dynamicProperties",
  shape: "data",
  lower: (anchor) => ({ op: "opaque", keyword: "https://example.com/keyword/dynamicProperties", value: anchor, schemas: [], reads: ["dynamicScope"] }),
  evaluate: (anchor, context) => {
    const { instance, dynamicAnchor } = opaqueContext(context);
    return (object) => {
      const evaluate = /** @type NonNullable<typeof dynamicAnchor> */ (dynamicAnchor)(/** @type string */ (anchor));
      if (instance.typeOf(object) !== "object" || evaluate === undefined) {
        return true;
      }

      let valid = true;
      for (const [name, value] of instance.entries(object)) {
        valid = evaluate(value, name) && valid;
      }
      return valid;
    };
  }
};

/** @type Keyword[] */
const keywords = [
  idKeyword, anchorKeyword, dynamicAnchorKeyword, typeKeyword, minimumKeyword, titleKeyword, propertiesKeyword, patternPropertiesKeyword, additionalPropertiesKeyword, requiredKeyword, itemsKeyword,
  minItemsKeyword, uniqueItemsKeyword, allOfKeyword, anyOfKeyword, refKeyword, dynamicRefKeyword, unevaluatedPropertiesKeyword, unevaluatedItemsKeyword, ifKeyword,
  sortedKeyword, propertiesByTypeKeyword, firstOfKeyword, firstOfPropertiesKeyword, sameAsKeyword, maxUnevaluatedKeyword, dynamicPropertiesKeyword,
  { uri: "https://example.com/keyword/defs", shape: { map: "schema" } },
  { uri: "https://example.com/keyword/then", shape: "schema" }
];

describe("Validator", () => {
  /** @type JsonSchema */
  let jsonSchema;

  /** @type string */
  let directory;
  let fileCount = 0;

  /** @type (schema: Record<string, Json>) => Promise<string> */
  const schemaFile = async (schema) => {
    const path = join(directory, `${fileCount++}.schema.json`);
    await writeFile(path, JSON.stringify({ $schema: dialectUri, ...schema }));
    return pathToFileURL(path).toString();
  };

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "json-schema-"));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true });
  });

  beforeEach(() => {
    jsonSchema = new JsonSchema({ allowRetrieval: [pathToFileURL(join(tmpdir(), "/")).href], dialects: [testDialect], keywords });
  });

  describe("validate", () => {
    test("property names that objects inherit are names like any other", async () => {
      const validator = await jsonSchema.compile(await schemaFile(JSON.parse(`{
        "properties": { "__proto__": { "type": "number" }, "foo": { "type": "number" }, "bar": { "type": "number" } }
      }`)));
      /** @type EvaluationPlugin */
      const plugin = {};

      for (const options of [undefined, { plugins: [plugin] }]) {
        expect(validator.validate(JSON.parse(`{ "constructor": "x", "toString": "x", "foo": 1 }`), options)).to.equal(true);
        expect(validator.validate(JSON.parse(`{ "__proto__": 1, "foo": 1 }`), options)).to.equal(true);
        expect(validator.validate(JSON.parse(`{ "__proto__": "x", "foo": 1 }`), options)).to.equal(false);
      }
    });

    test("keywords", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        type: "object",
        properties: { foo: { type: "number", minimum: 3 } }
      }));

      expect(validator.validate({ foo: 3 })).to.equal(true);
      expect(validator.validate({ foo: 2 })).to.equal(false);
      expect(validator.validate({ foo: "3" })).to.equal(false);
      expect(validator.validate([])).to.equal(false);
    });

    test("keywords that always pass", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        title: "foo",
        properties: { foo: { title: "bar" }, bar: { title: "baz", type: "number" } }
      }));

      expect(validator.validate({ foo: 1, bar: 1 })).to.equal(true);
      expect(validator.validate({ foo: 1, bar: "1" })).to.equal(false);
      expect(validator.validateJson(`{ "foo": 1, "bar": "1" }`)).to.equal(false);
    });

    test("boolean schemas", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: false, bar: true } }));

      expect(validator.validate({ bar: 1 })).to.equal(true);
      expect(validator.validate({ foo: 1 })).to.equal(false);
    });

    test("schemas that refer to each other", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/tree",
        type: "object",
        properties: { child: { $ref: "#" }, value: { type: "number" } }
      }));

      expect(validator.validate({ value: 1, child: { value: 2, child: {} } })).to.equal(true);
      expect(validator.validate({ value: 1, child: { child: { value: "2" } } })).to.equal(false);
    });

    test("a schema that doesn't exist", async () => {
      const uri = await schemaFile({});
      await expect(jsonSchema.compile(`${uri}#/nope`)).rejects.toThrow();
    });

    test("the shortcut", async () => {
      const uri = await schemaFile({ type: "string" });
      expect(await jsonSchema.validate(uri, "foo")).to.equal(true);
    });

    test("objects", async () => {
      for (const additionalProperties of /** @type Json[] */ ([false, { type: "boolean" }])) {
        const validator = await jsonSchema.compile(await schemaFile({
          type: "object",
          properties: { name: { type: "string" }, count: { type: "integer" }, size: { type: "number", minimum: 0 } },
          required: ["name", "other"],
          additionalProperties
        }));

        expect(validator.validate({ name: "a", other: true })).to.equal(additionalProperties !== false);
        expect(validator.validate({ name: "a", count: 1, other: true, more: true })).to.equal(additionalProperties !== false);
        expect(validator.validate({ name: "a", count: 1, size: 2, other: 1 })).to.equal(false);
        expect(validator.validate({ name: "a", count: 1.5, other: true })).to.equal(false);
        expect(validator.validate({ name: "a", size: -1, other: true })).to.equal(false);
        expect(validator.validate({ name: 1, other: true })).to.equal(false);
        expect(validator.validate({ name: "a" })).to.equal(false);
        expect(validator.validate({ other: true })).to.equal(false);
        expect(validator.validate([])).to.equal(false);
      }
    });

    test("objects with plugins and ASTs", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { name: { type: "string" } },
        required: ["name", "other"],
        additionalProperties: { type: "boolean" }
      }));
      /** @type EvaluationPlugin */
      const plugin = {};

      for (const options of [undefined, { plugins: [plugin] }]) {
        expect(validator.validate({ name: "a", other: true }, options)).to.equal(true);
        expect(validator.validate({ name: "a" }, options)).to.equal(false);
        expect(validator.validate({ other: true }, options)).to.equal(false);
        expect(validator.validate("not an object", options)).to.equal(true);
        expect(validator.validateJson(`{ "name": "a", "other": true }`, options)).to.equal(true);
        expect(validator.validateJson(`{ "name": "a", "name": "b" }`, options)).to.equal(false);
        expect(validator.validateJson(`{ "name": "a", "name": "b", "name": "c" }`, options)).to.equal(false);
        expect(validator.validate({ name: "a", other: 1 }, options)).to.equal(false);
        expect(validator.validateJson(`{ "other": true }`, options)).to.equal(false);
      }

      const result = validator.validate({ name: "a" }, { output: "BASIC" });
      expect(result.valid).to.equal(false);
      expect(result.errors.map((error) => locations(/** @type ValidationError */ (error)).ruleId)).to.eql([requiredKeyword.uri]);
    });

    test("objects with only properties", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        type: "object",
        properties: { size: { type: "number", minimum: 0 }, count: { type: "integer" } }
      }));

      expect(validator.validate({ size: 1, count: 1, more: "x" })).to.equal(true);
      expect(validator.validate({ size: -1 })).to.equal(false);
      expect(validator.validate({ count: 1.5 })).to.equal(false);
      expect(validator.validate([])).to.equal(false);
    });

    test("objects without other properties", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { name: { type: "string" }, size: { type: "number" } },
        required: ["name"],
        additionalProperties: false
      }));

      expect(validator.validate({ name: "a", size: 1 })).to.equal(true);
      expect(validator.validate({ name: "a", more: 1 })).to.equal(false);
    });

    test("objects without a type", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { name: { type: "string" }, size: { type: "number" } },
        required: ["name"]
      }));

      expect(validator.validate({ name: "a", more: 1 })).to.equal(true);
      expect(validator.validate({ more: 1 })).to.equal(false);
      expect(validator.validate({ name: 1 })).to.equal(false);
      expect(validator.validate("not an object")).to.equal(true);
    });

    test("objects with patterns", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        type: "object",
        properties: { name: { type: "string" } },
        patternProperties: { "^x-": { type: "number" } },
        required: ["name", "x-count"],
        additionalProperties: false
      }));

      expect(validator.validate({ "name": "a", "x-count": 1 })).to.equal(true);
      expect(validator.validate({ "name": "a", "x-count": "1" })).to.equal(false);
      expect(validator.validate({ name: "a" })).to.equal(false);
      expect(validator.validate({ "name": "a", "x-count": 1, "more": 1 })).to.equal(false);
      expect(validator.validate({ "name": 1, "x-count": 1 })).to.equal(false);
      expect(validator.validate(1)).to.equal(false);
    });

    test("arrays", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        type: "array",
        minItems: 1,
        items: { type: "array", items: { type: "number" } }
      }));

      expect(validator.validate([[1, 2], []])).to.equal(true);
      expect(validator.validate([])).to.equal(false);
      expect(validator.validate({})).to.equal(false);
      expect(validator.validate([[1, "2"]])).to.equal(false);
      expect(validator.validate([1])).to.equal(false);
    });

    test("unique items", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ uniqueItems: true }));
      /** @type (count: number) => Json[] */
      const plugins = (count) => Array.from({ length: count }, (_, index) => ({ name: `plugin${index}`, enabled: index % 2 === 0 }));

      /** @type EvaluationPlugin */
      const plugin = {};
      // Plain values, with a plugin, and as an AST, without and with one
      /** @type ((instance: Json) => boolean)[] */
      const validates = [
        (instance) => validator.validate(instance),
        (instance) => validator.validate(instance, { plugins: [plugin] }),
        (instance) => validator.validateJson(JSON.stringify(instance)),
        (instance) => validator.validateJson(JSON.stringify(instance), { plugins: [plugin] })
      ];

      // Short arrays compare every pair, and longer ones look them up
      for (const validate of validates) {
        for (const length of [3, 20]) {
          const items = plugins(length);
          expect(validate(items)).to.equal(true);
          expect(validate([...items, { enabled: true, name: "plugin0" }])).to.equal(false);
          expect(validate([...items, { name: "plugin0" }])).to.equal(true);
          expect(validate([...items, { name: "plugin0", enabled: true, more: 1 }])).to.equal(true);
          expect(validate([...items, 1, "1", 1.0])).to.equal(false);
          expect(validate([...items, 1, "1", true, null])).to.equal(true);
          expect(validate([...items, [1, { a: [2] }], [1, { a: [2] }]])).to.equal(false);
          expect(validate([...items, [1, { a: [2] }], [1, { a: [3] }]])).to.equal(true);
          expect(validate([...items, [1, 2], [2, 1]])).to.equal(true);
          expect(validate([...items, [1, 2], [1, 2, 3]])).to.equal(true);
          expect(validate([{}, ...items, {}])).to.equal(false);
          expect(validate([...items, { name: { first: "a" } }, { name: { first: "b" } }])).to.equal(true);
          expect(validate([...items, { name: { first: "a" } }, { name: { first: "a" } }])).to.equal(false);
          expect(validate([...items, {}, []])).to.equal(true);
        }
      }
    });

    test("unique items that couldn't be parsed aren't duplicates", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ uniqueItems: true }));
      /** @type EvaluationPlugin */
      const plugin = {};
      /** @type (count: number) => string */
      const plugins = (count) => Array.from({ length: count }, (_, index) => `{ "name": "plugin${index}" }`).join(", ");

      for (const options of [undefined, { plugins: [plugin] }]) {
        for (const length of [3, 20]) {
          const items = plugins(length);
          /** @type (json: string) => boolean */
          const validate = (json) => /** @type boolean */ (validator.validateNode(fromJson(json).node, options));
          expect(validate(`[${items}, @, @]`)).to.equal(true);
          expect(validate(`[${items}, { "name": }, { "name": }]`)).to.equal(true);
          expect(validate(`[${items}, { "name": "plugin0", "x": }, { "name": "plugin0", "x": }]`)).to.equal(true);
          expect(validate(`[${items}, [1, @], [1, @]]`)).to.equal(true);
          expect(validate(`[${items}, { "name": }, { "name": "plugin0" }]`)).to.equal(false);
        }
      }
    });

    test("items of a type", async () => {
      for (const [items, valid, invalid] of /** @type [Json, Json, Json][] */ ([
        [{ type: "number" }, 1.5, "1"],
        [{ type: "integer" }, 1, 1.5],
        [{ type: ["integer", "string"] }, "1", 1.5],
        [{ type: "number", minimum: 0 }, 1, -1]
      ])) {
        const validator = await jsonSchema.compile(await schemaFile({ items }));
        expect(validator.validate([valid, valid])).to.equal(true);
        expect(validator.validate([valid, invalid])).to.equal(false);
        expect(validator.validate("not an array")).to.equal(true);
      }
    });
  });

  describe("output formats", () => {
    test("BASIC", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/basic",
        properties: { foo: { $ref: "#/$defs/number" } },
        $defs: { number: { type: "number", minimum: 3 } }
      }));

      const result = validator.validate({ foo: "bar" }, { output: "BASIC" });

      expect(result.valid).to.equal(false);
      expect(result.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
        {
          ruleId: typeKeyword.uri,
          absoluteKeywordLocation: "https://example.com/basic#/$defs/number/type",
          instanceLocation: "/foo"
        }
      ]);
      expect(result.errors[0]).to.eql({
        source: "json-schema",
        ruleId: typeKeyword.uri,
        absoluteKeywordLocation: "https://example.com/basic#/$defs/number/type",
        instanceLocation: "/foo",
        place: undefined
      });
    });

    // A file's location would reveal where the schemas are on the machine
    test("a location in a file is relative to the working directory", async () => {
      const other = await schemaFile({ type: "number" });
      const otherName = other.slice(other.lastIndexOf("/") + 1);
      const main = await schemaFile({
        properties: { foo: { type: "number" }, bar: { $ref: otherName } }
      });
      const validator = await jsonSchema.compile(main);
      const mainPath = relative(cwd(), fileURLToPath(main));
      const otherPath = relative(cwd(), fileURLToPath(other));

      const basic = validator.validate({ foo: "x", bar: "y" }, { output: "BASIC" });
      expect(basic.errors.map((error) => /** @type ValidationError */ (error).absoluteKeywordLocation)).to.eql([
        `${mainPath}#/properties/foo/type`,
        `${otherPath}#/type`
      ]);

      const detailed = validator.validate({ bar: "y" }, { output: "DETAILED" });
      expect(detailed.errors).to.eql([{
        source: "json-schema",
        ruleId: "https://example.com/keyword/properties",
        absoluteKeywordLocation: `${mainPath}#/properties`,
        instanceLocation: "",
        place: undefined,
        errors: [{
          source: "json-schema",
          ruleId: "https://example.com/keyword/ref",
          absoluteKeywordLocation: `${mainPath}#/properties/bar/$ref`,
          instanceLocation: "/bar",
          place: undefined,
          errors: [{ source: "json-schema", ruleId: typeKeyword.uri, absoluteKeywordLocation: `${otherPath}#/type`, instanceLocation: "/bar", place: undefined }]
        }]
      }]);
    });

    test("a location that isn't in a file stays absolute", async () => {
      const main = await schemaFile({
        properties: { foo: { $ref: "https://example.com/mixed" }, bar: { type: "number" } },
        $defs: { mixed: { $id: "https://example.com/mixed", type: "number" } }
      });
      const validator = await jsonSchema.compile(main);

      const result = validator.validate({ foo: "x", bar: "y" }, { output: "BASIC" });
      expect(result.errors.map((error) => /** @type ValidationError */ (error).absoluteKeywordLocation)).to.eql([
        "https://example.com/mixed#/type",
        `${relative(cwd(), fileURLToPath(main))}#/properties/bar/type`
      ]);
    });

    test("the absolute keyword location of a subschema with its own identifier", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { foo: { $id: "https://example.com/embedded", type: "number" } }
      }));

      const result = validator.validate({ foo: "bar" }, { output: "BASIC" });
      expect(result.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
        {
          ruleId: typeKeyword.uri,
          absoluteKeywordLocation: "https://example.com/embedded#/type",
          instanceLocation: "/foo"
        }
      ]);
    });

    test("the absolute keyword location of a subschema in a sibling keyword", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/sibling",
        if: { type: "string" },
        then: { minimum: 3, allOf: [{ $id: "https://example.com/sibling-embedded", type: "number" }] }
      }));

      const result = validator.validate("foo", { output: "BASIC" });
      expect(result.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
        {
          ruleId: typeKeyword.uri,
          absoluteKeywordLocation: "https://example.com/sibling-embedded#/type",
          instanceLocation: ""
        }
      ]);
    });

    test("locations with characters that aren't allowed in a fragment", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/encoded",
        properties: { "a^b": { $ref: "#/$defs/c%20d" } },
        $defs: { "c d": { type: "number" } }
      }));

      const result = validator.validate({ "a^b": "x" }, { output: "BASIC" });
      expect(result.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
        {
          ruleId: typeKeyword.uri,
          absoluteKeywordLocation: "https://example.com/encoded#/$defs/c%20d/type",
          instanceLocation: "/a^b"
        }
      ]);
    });

    test("an error is described by its instance location and absolute keyword location", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/message",
        properties: { foo: { type: "number" } }
      }));

      const [error] = validator.validate({ foo: "bar" }, { output: "BASIC" }).errors;
      expect(outputErrorMessage(error)).to.equal("'/foo' fails the constraint at 'https://example.com/message#/properties/foo/type'");
    });

    test("an error for the whole instance is described as the instance", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ $id: "https://example.com/root-message", type: "number" }));

      const [error] = validator.validate("foo", { output: "BASIC" }).errors;
      expect(outputErrorMessage(error)).to.equal("The instance fails the constraint at 'https://example.com/root-message#/type'");
    });

    test("an error converts to a VFileMessage and leaves stackTraceLimit as it was", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ $id: "https://example.com/vfile", type: "number" }));
      const stackTraceLimit = Error.stackTraceLimit;

      const [error] = validator.validate("foo", { output: "BASIC" }).errors;
      const message = toVFileMessage(error);
      expect(message).to.be.instanceOf(VFileMessage);
      expect(message.reason).to.equal("The instance fails the constraint at 'https://example.com/vfile#/type'");
      expect(message.ruleId).to.equal(typeKeyword.uri);
      expect(message.source).to.equal("json-schema");
      expect(Error.stackTraceLimit).to.equal(stackTraceLimit);
    });

    test("BASIC for a valid instance", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ type: "number" }));

      expect(validator.validate(1, { output: "BASIC" })).to.eql({ valid: true, errors: [] });
    });

    test("BASIC drops errors from subschemas that don't matter", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/any-of",
        anyOf: [{ type: "number", minimum: 0 }, { type: "string", minLength: 1 }],
        properties: { foo: false }
      }));

      expect(validator.validate("foo", { output: "BASIC" })).to.eql({ valid: true, errors: [] });

      const result = validator.validate({ foo: 1 }, { output: "BASIC" });
      expect(result.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
        {
          ruleId: anyOfKeyword.uri,
          absoluteKeywordLocation: "https://example.com/any-of#/anyOf",
          instanceLocation: ""
        },
        {
          ruleId: typeKeyword.uri,
          absoluteKeywordLocation: "https://example.com/any-of#/anyOf/0/type",
          instanceLocation: ""
        },
        {
          ruleId: typeKeyword.uri,
          absoluteKeywordLocation: "https://example.com/any-of#/anyOf/1/type",
          instanceLocation: ""
        },
        {
          ruleId: "https://json-schema.org/validation",
          absoluteKeywordLocation: "https://example.com/any-of#/properties/foo",
          instanceLocation: "/foo"
        }
      ]);
    });

    test("DETAILED", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/detailed",
        properties: { foo: { type: "number" } }
      }));

      const result = validator.validate({ foo: "bar" }, { output: "DETAILED" });
      expect(result.errors.map((error) => detailedLocations(/** @type DetailedValidationError */ (error)))).to.eql([
        {
          ruleId: propertiesKeyword.uri,
          absoluteKeywordLocation: "https://example.com/detailed#/properties",
          instanceLocation: "",
          errors: [
            {
              ruleId: typeKeyword.uri,
              absoluteKeywordLocation: "https://example.com/detailed#/properties/foo/type",
              instanceLocation: "/foo"
            }
          ]
        }
      ]);
    });

    test("a custom output format", async () => {
      jsonSchema.addOutputFormat(/** @type any */ ("COUNT"), () => {
        let count = 0;
        return {
          plugin: { afterKeyword: (_keyword, _at, valid) => count += valid ? 0 : 1 },
          output: () => /** @type any */ (count)
        };
      });
      const validator = await jsonSchema.compile(await schemaFile({ type: "number", minimum: 3 }));

      expect(validator.validate("foo", { output: /** @type any */ ("COUNT") })).to.equal(1);
      expect(validator.validate(1, { output: /** @type any */ ("COUNT") })).to.equal(1);
      expect(validator.validate(5, { output: /** @type any */ ("COUNT") })).to.equal(0);
    });

    test("FLAG can't be replaced", () => {
      expect(() => jsonSchema.addOutputFormat("FLAG", () => ({ output: () => true }))).to.throw("built in");
    });

    test("an unknown output format", async () => {
      const validator = await jsonSchema.compile(await schemaFile({}));
      expect(() => validator.validate(1, { output: /** @type any */ ("NOPE") })).to.throw("isn't supported");
    });
  });

  describe("instance locations", () => {
    test("are escaped and built from every child on the way, through schemas on the same instance", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { "a/b": { items: { allOf: [{ properties: { "c~d": { type: "number" } } }] } } }
      }));

      const result = validator.validate({ "a/b": [{ "c~d": 1 }, { "c~d": "x" }] }, { output: "BASIC" });
      expect(result.errors.map((error) => /** @type ValidationError */ (error).instanceLocation)).to.eql(["/a~1b/1/c~0d"]);
    });
  });

  describe("validateJson", () => {
    test("instance locations of names that are encoded in node locations", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { "a/b": { properties: { "c~d": { properties: { "%41 é": { type: "number" } } } } } }
      }));

      const result = validator.validateJson(`{ "a/b": { "c~d": { "%41 é": "x" } } }`, { output: "BASIC" });
      expect(result.errors.map((error) => /** @type ValidationError */ (error).instanceLocation)).to.eql(["/a~1b/c~0d/%41 é"]);
    });

    test("instance locations are relative to the node evaluation starts from", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { bar: { type: "number" } } }));
      const document = fromJson(`{ "foo": { "bar": "x" } }`, "https://example.com/document");
      const node = /** @type any */ (document.node).children[0].children[1];

      const result = validator.validateNode(node, { output: "BASIC" });
      expect(result.errors.map((error) => /** @type ValidationError */ (error).instanceLocation)).to.eql(["/bar"]);
    });

    test("errors have positions", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { type: "number" } } }));

      const result = validator.validateJson(`{\n  "foo": "bar"\n}`, { output: "BASIC" });
      expect(result.valid).to.equal(false);
      expect(result.errors[0].place).to.eql({
        start: { line: 2, column: 10, offset: 11 },
        end: { line: 2, column: 15, offset: 16 }
      });
    });

    test("an error with a position is described without its instance location", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/positioned",
        properties: { foo: { type: "number" } }
      }));

      const [error] = validator.validateJson(`{ "foo": "bar" }`, { output: "BASIC" }).errors;
      expect(String(toVFileMessage(error))).to.equal("1:10-1:15: Fails the constraint at 'https://example.com/positioned#/properties/foo/type'");
    });

    test("a syntax error converts to a VFileMessage", async () => {
      const validator = await jsonSchema.compile(await schemaFile({}));

      const [error] = validator.validateJson(`[True]`, { output: "BASIC" }).errors;
      const message = toVFileMessage(error);
      expect(String(message)).to.equal("1:2-1:6: 'True' is not a valid value");
      expect(message.ruleId).to.equal("invalid-literal");
      expect(message.source).to.equal("json");
      expect(message.actual).to.equal("True");
    });

    test("syntax errors are included and make the instance invalid", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { type: "number" } } }));

      expect(validator.validateJson(`{ "foo": 1, }`)).to.equal(false);

      const result = validator.validateJson(`{ "bar": 1, "foo": "x", }`, { output: "BASIC" });
      expect(result.errors.map((error) => error.ruleId)).to.eql([typeKeyword.uri, "trailing-comma"]);
    });

    test("values that couldn't be parsed aren't evaluated", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { type: "number" } } }));

      const result = validator.validateJson(`{ "foo": }`, { output: "BASIC" });
      expect(result.errors.map((error) => error.ruleId)).to.eql(["value-expected"]);
    });
  });

  describe("annotate", () => {
    test("annotations are attached to the instance", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        title: "root",
        properties: { foo: { title: "foo", allOf: [{ title: "also foo" }] } }
      }));

      const { output, node } = validator.annotate({ foo: 1 });
      expect(output).to.equal(true);
      expect(node.data?.annotations?.get(titleKeyword.uri)).to.eql(["root"]);
      expect(pointerGet("/foo", /** @type any */ (node)).data.annotations.get(titleKeyword.uri)).to.eql(["foo", "also foo"]);
    });

    test("annotations from failing schemas are dropped", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        anyOf: [{ title: "number", type: "number" }, { title: "string", type: "string" }]
      }));

      const { node } = validator.annotate("foo");
      expect(node.data?.annotations?.get(titleKeyword.uri)).to.eql(["string"]);
    });

    test("an invalid instance has no annotations", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ title: "root", type: "number" }));

      const { output, node } = validator.annotate("foo", { output: "BASIC" });
      expect(output.valid).to.equal(false);
      expect(node.data?.annotations).to.equal(undefined);
    });

    test("unknown keywords are annotations", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ foo: { bar: 1 } }));

      const { node } = validator.annotate(1);
      expect(node.data?.annotations?.get("https://json-schema.org/keyword/unknown#foo")).to.eql([{ bar: 1 }]);
    });

    test("x- keywords are annotations if unknown keywords are errors", async () => {
      for (const unknownKeywords of /** @type const */ (["error", "ignore"])) {
        const strictDialectUri = `https://example.com/${unknownKeywords}-dialect`;
        const jsonSchema = new JsonSchema({
          allowRetrieval: [pathToFileURL(join(tmpdir(), "/")).href],
          dialects: [testDialect, { uri: strictDialectUri, keywords: {}, unknownKeywords }],
          keywords
        });
        const path = join(directory, `${fileCount++}.schema.json`);
        await writeFile(path, JSON.stringify({ "$schema": strictDialectUri, "x-foo": 1 }));
        const validator = await jsonSchema.compile(pathToFileURL(path).toString());

        const { node } = validator.annotate(1);
        const annotations = node.data?.annotations?.get("https://json-schema.org/keyword/unknown#x-foo");
        expect(annotations).to.eql(unknownKeywords === "error" ? [1] : undefined);
      }
    });

    test("annotateJson", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { title: "foo" } } }));

      const { output, status, node } = validator.annotateJson(`{ "foo": 1, }`);
      expect(output).to.equal(false);
      expect(status).to.equal("recovered");
      expect(pointerGet("/foo", /** @type any */ (node)).data.annotations.get(titleKeyword.uri)).to.eql(["foo"]);
    });

    test("annotateNode", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { title: "foo" } } }));
      const { node } = fromJson(`{ "foo": 1 }`);

      expect(validator.annotateNode(node)).to.equal(true);
      expect(pointerGet("/foo", /** @type any */ (node)).data.annotations.get(titleKeyword.uri)).to.eql(["foo"]);
    });
  });

  describe("unevaluatedProperties", () => {
    test("properties evaluated by subschemas", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        allOf: [{ properties: { foo: true } }],
        unevaluatedProperties: false
      }));

      expect(validator.validate({ foo: 1 })).to.equal(true);
      expect(validator.validate({ foo: 1, bar: 2 })).to.equal(false);
    });

    test("keyword order doesn't matter", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        unevaluatedProperties: false,
        properties: { foo: true }
      }));

      expect(validator.validate({ foo: 1 })).to.equal(true);
    });

    test("properties evaluated by a failing subschema don't count", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        anyOf: [
          { properties: { foo: true, bar: { type: "number" } } },
          { properties: { foo: true } }
        ],
        unevaluatedProperties: false
      }));

      expect(validator.validate({ foo: 1, bar: 1 })).to.equal(true);
      expect(validator.validate({ foo: 1, bar: "x" })).to.equal(false);
    });

    test("every passing branch counts", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        anyOf: [{ properties: { foo: true } }, { properties: { bar: true } }],
        unevaluatedProperties: false
      }));

      expect(validator.validate({ foo: 1, bar: 1 })).to.equal(true);
    });

    test("properties of a property don't count", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { foo: { properties: { bar: true } } },
        unevaluatedProperties: false
      }));

      expect(validator.validate({ foo: { bar: 1 } })).to.equal(true);
      expect(validator.validate({ foo: {}, bar: 1 })).to.equal(false);
    });
  });

  describe("unevaluatedItems", () => {
    test("items evaluated by subschemas, whatever the items are checked for", async () => {
      for (const items of /** @type Json[] */ ([{ type: "number" }, { type: "integer" }, { type: ["number", "string"] }, { type: "number", minimum: 0 }])) {
        for (const subschema of /** @type Json[] */ ([{ items }, { type: "array", minItems: 1, items }])) {
          const validator = await jsonSchema.compile(await schemaFile({
            anyOf: [subschema, { type: "object" }],
            unevaluatedItems: false
          }));

          expect(validator.validate([1, 2])).to.equal(true);
          expect(validator.validate([1, true])).to.equal(false);
        }
      }
    });
  });

  describe("dynamic scope", () => {
    test("the outermost dynamic anchor is used", async () => {
      const uri = await schemaFile({
        $id: "https://example.com/strict-tree",
        $dynamicAnchor: "node",
        $ref: "tree",
        unevaluatedProperties: false,
        $defs: {
          tree: {
            $id: "https://example.com/tree",
            $dynamicAnchor: "node",
            properties: { children: { $ref: "#/$defs/children" } },
            $defs: { children: { anyOf: [{ type: "null" }, { properties: { child: { $dynamicRef: "#node" } } }] } }
          }
        }
      });

      const strictTree = await jsonSchema.compile(uri);
      expect(strictTree.validate({ children: { child: {} } })).to.equal(true);
      expect(strictTree.validate({ children: { child: { extra: 1 } } })).to.equal(false);

      const tree = await jsonSchema.compile(`${uri}#/$defs/tree`);
      expect(tree.validate({ children: { child: { extra: 1 } } })).to.equal(true);
    });
  });

  describe("plugins", () => {
    test("state is passed explicitly", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/plugin",
        properties: { foo: { type: "number" } }
      }));

      /** @type string[] */
      const calls = [];
      /** @type EvaluationPlugin<string, string> */
      const plugin = {
        beforeSchema: (schema, at, parent) => {
          calls.push(`beforeSchema ${schema.absoluteKeywordLocation} ${at.instanceLocation} ${parent}`);
          return `schema ${at.instanceLocation}`;
        },
        afterSchema: (_schema, _at, valid, state) => calls.push(`afterSchema ${state} ${valid}`),
        beforeKeyword: (keyword, _at, schema) => {
          calls.push(`beforeKeyword ${keyword.keywordUri} in ${schema}`);
          return `keyword ${keyword.absoluteKeywordLocation.replace(/.*#/, "")}`;
        },
        afterKeyword: (_keyword, _at, valid, state) => calls.push(`afterKeyword ${state} ${valid}`)
      };

      expect(validator.validate({ foo: 1 }, { plugins: [plugin] })).to.equal(true);
      expect(calls).to.eql([
        "beforeSchema https://example.com/plugin#  undefined",
        `beforeKeyword ${propertiesKeyword.uri} in schema `,
        "beforeSchema https://example.com/plugin#/properties/foo /foo keyword /properties",
        `beforeKeyword ${typeKeyword.uri} in schema /foo`,
        "afterKeyword keyword /properties/foo/type true",
        "afterSchema schema /foo true",
        "afterKeyword keyword /properties true",
        "afterSchema schema  true"
      ]);
    });

    test("each plugin gets its own state", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { type: "number" } } }));

      /** @type (name: string, calls: string[]) => EvaluationPlugin<string, string> */
      const namedPlugin = (name, calls) => ({
        beforeSchema: (_schema, at, parent) => `${name} schema ${at.instanceLocation} in ${parent}`,
        afterSchema: (_schema, _at, _valid, state) => calls.push(state),
        beforeKeyword: (keyword, _at, schema) => `${name} keyword ${keyword.absoluteKeywordLocation.replace(/.*#/, "")} in ${schema}`,
        afterKeyword: (_keyword, _at, _valid, state) => calls.push(state)
      });

      /** @type string[] */
      const aCalls = [];
      /** @type string[] */
      const bCalls = [];
      const result = validator.validate({ foo: "bar" }, { output: "BASIC", plugins: [namedPlugin("a", aCalls), namedPlugin("b", bCalls)] });

      expect(result.errors.map((error) => error.ruleId)).to.eql([typeKeyword.uri]);
      expect(aCalls).to.eql([
        "a keyword /properties/foo/type in a schema /foo in a keyword /properties in a schema  in undefined",
        "a schema /foo in a keyword /properties in a schema  in undefined",
        "a keyword /properties in a schema  in undefined",
        "a schema  in undefined"
      ]);
      expect(bCalls).to.eql(aCalls.map((call) => call.replaceAll(/\ba /g, "b ")));
    });

    test("schemas and keywords evaluated on the same instance share a location that can be kept", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { foo: { $ref: "#/$defs/number" } },
        $defs: { number: { type: "number" } }
      }));

      /** @type EvaluationLocation[] */
      const locations = [];
      /** @type EvaluationPlugin */
      const plugin = { afterKeyword: (_keyword, at) => locations.push(at) };

      validator.validate({ foo: 1 }, { plugins: [plugin] });
      expect(locations.map((at) => at.instanceLocation)).to.eql(["/foo", "/foo", ""]);
      expect(locations[0]).to.equal(locations[1]);
      expect(locations[1]).not.to.equal(locations[2]);
    });

    test("a location's value is the instance, for a JS value or an AST", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { type: "number" } } }));

      /** @type unknown[] */
      const values = [];
      /** @type EvaluationPlugin */
      const plugin = { afterSchema: (_schema, at) => values.push(at.value()) };

      validator.validate({ foo: 1 }, { plugins: [plugin] });
      validator.validateNode(fromJson(`{ "foo": 1 }`).node, { plugins: [plugin] });
      expect(values).to.eql([1, { foo: 1 }, 1, { foo: 1 }]);
    });

    test("plugins see annotations with their location and keyword state", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/annotation",
        properties: { foo: { title: "Foo" } }
      }));

      /** @type unknown[] */
      const annotations = [];
      /** @type EvaluationPlugin<undefined, string> */
      const plugin = {
        beforeKeyword: (keyword) => keyword.absoluteKeywordLocation,
        annotation: (keyword, at, value, state) => annotations.push([keyword.keywordUri, at.instanceLocation, value, state])
      };

      expect(validator.validate({ foo: 1 }, { plugins: [plugin] })).to.equal(true);
      expect(annotations).to.eql([
        [titleKeyword.uri, "/foo", "Foo", "https://example.com/annotation#/properties/foo/title"]
      ]);
    });

    test("plugins see annotations that aren't kept because something failed", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        anyOf: [{ title: "String", type: "string" }, { title: "Number", type: "number" }],
        properties: { foo: { title: "Foo", type: "string" } }
      }));

      /** @type unknown[] */
      const annotations = [];
      /** @type EvaluationPlugin */
      const plugin = { annotation: (_keyword, at, value) => annotations.push([at.instanceLocation, value]) };

      const json = `{ "foo": 1 }`;
      validator.validateJson(json, { plugins: [plugin] });
      const { node } = validator.annotateJson(json, { plugins: [plugin] });

      const expected = [["", "String"], ["", "Number"], ["/foo", "Foo"]];
      expect(annotations).to.eql([...expected, ...expected]);
      // The spec's rule still decides which annotations are attached to the instance
      expect(/** @type any */ (node).data?.annotations).to.equal(undefined);
      expect(/** @type any */ (node).children[0].children[1].data?.annotations).to.equal(undefined);
    });

    test("each plugin gets its own keyword state with an annotation", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ title: "Root" }));

      /** @type (name: string, calls: string[]) => EvaluationPlugin<undefined, string> */
      const namedPlugin = (name, calls) => ({
        beforeKeyword: () => name,
        annotation: (_keyword, _at, value, state) => calls.push(`${state} ${JSON.stringify(value)}`)
      });

      /** @type string[] */
      const calls = [];
      validator.validate({}, { plugins: [namedPlugin("a", calls), namedPlugin("b", calls)] });
      expect(calls).to.eql([`a "Root"`, `b "Root"`]);
    });

    test("plugins see keywords that have no effect", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: {}, type: "number" }));

      /** @type [string, boolean][] */
      const calls = [];
      /** @type EvaluationPlugin */
      const plugin = { afterKeyword: (keyword, _at, valid) => calls.push([keyword.keywordUri, valid]) };

      expect(validator.validate(1, { plugins: [plugin] })).to.equal(true);
      expect(calls).to.eql([[propertiesKeyword.uri, true], [typeKeyword.uri, true]]);
    });

    test("a keyword that only annotates is left out for plugins that don't see annotations", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ title: "foo", type: "number" }));

      /** @type [string, boolean][] */
      const calls = [];
      /** @type EvaluationPlugin */
      const plugin = { afterKeyword: (keyword, _at, valid) => calls.push([keyword.keywordUri, valid]) };
      validator.validate(1, { plugins: [plugin] });
      expect(calls).to.eql([[typeKeyword.uri, true]]);

      calls.length = 0;
      validator.validate(1, { plugins: [{ ...plugin, annotation: () => undefined }] });
      expect(calls).to.eql([[titleKeyword.uri, true], [typeKeyword.uri, true]]);
    });

    test("plugins see every keyword once, even with an output format", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ anyOf: [{ type: "number" }, { type: "string" }, false] }));

      let count = 0;
      /** @type EvaluationPlugin */
      const plugin = { afterKeyword: () => count++ };

      const result = validator.validate(1, { output: "BASIC", plugins: [plugin] });
      expect(result.valid).to.equal(true);
      expect(count).to.equal(3);
    });
  });

  describe("an evaluation inside an evaluation", () => {
    test("the outer evaluation isn't affected", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/nested",
        title: "root",
        properties: { foo: { type: "number" } }
      }));

      /** @type unknown[] */
      const nestedResults = [];
      /** @type EvaluationPlugin */
      const plugin = {
        afterKeyword: (keyword) => {
          if (keyword.keywordUri === typeKeyword.uri && nestedResults.length === 0) {
            // The same specialization as the outer evaluation
            nestedResults.push(validator.annotate({ foo: 1 }, { output: "BASIC", plugins: [{}] }).output);
          }
        }
      };

      const result = validator.annotate({ foo: "bar" }, { output: "BASIC", plugins: [plugin] });
      expect(nestedResults).to.eql([{ valid: true, errors: [] }]);
      expect(result.output.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
        {
          ruleId: typeKeyword.uri,
          absoluteKeywordLocation: "https://example.com/nested#/properties/foo/type",
          instanceLocation: "/foo"
        }
      ]);
    });
  });

  describe("predicate", () => {
    test("checks instances of its types and passes the others", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ sorted: "ascending" }));

      expect(validator.validate([1, 2, 2, 3])).to.equal(true);
      expect(validator.validate([2, 1])).to.equal(false);
      expect(validator.validate("not an array")).to.equal(true);
      expect(validator.validateJson("[1, 3, 2]")).to.equal(false);
      expect(validator.validateJson("[1, 2, 3]")).to.equal(true);
    });

    test("an error is for the keyword", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ $id: "https://example.com/sorted", sorted: "descending" }));

      const result = validator.validate([1, 2], { output: "BASIC" });
      expect(result.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
        { ruleId: sortedKeyword.uri, absoluteKeywordLocation: "https://example.com/sorted#/sorted", instanceLocation: "" }
      ]);
    });
  });

  describe("opaque", () => {
    test("applies schemas", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        propertiesByType: { number: { minimum: 0 }, string: true }
      }));

      expect(validator.validate({ a: 1, b: "x", c: null })).to.equal(true);
      expect(validator.validate({ a: -1 })).to.equal(false);
      expect(validator.validateJson(`{ "a": -1 }`)).to.equal(false);
      expect(validator.validate(-1)).to.equal(true);
    });

    test("errors are at the instance locations it gives", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/by-type",
        propertiesByType: { number: { minimum: 0 } }
      }));

      for (const result of [validator.validate({ a: 1, b: -1, c: -2 }, { output: "BASIC" }), validator.validateJson(`{ "a": 1, "b": -1, "c": -2 }`, { output: "BASIC" })]) {
        expect(result.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
          { ruleId: minimumKeyword.uri, absoluteKeywordLocation: "https://example.com/by-type#/propertiesByType/number/minimum", instanceLocation: "/b" },
          { ruleId: minimumKeyword.uri, absoluteKeywordLocation: "https://example.com/by-type#/propertiesByType/number/minimum", instanceLocation: "/c" }
        ]);
      }
    });

    test("its value is only data, even if it looks like a schema", async () => {
      const value = { op: "apply", schema: "https://example.com/not-a-schema" };
      const validator = await jsonSchema.compile(await schemaFile({ sameAs: value }));

      expect(validator.validate(value)).to.equal(true);
      expect(jsonSchema.restoreValidator(JSON.parse(JSON.stringify(validator.serialize()))).validate(value)).to.equal(true);
    });

    test("an opaque operation that doesn't explain its failure has an error of its own", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ $id: "https://example.com/max-unevaluated", maxUnevaluated: 0 }));

      const result = validator.validate({ a: 1 }, { output: "BASIC" });
      expect(result.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
        { ruleId: maxUnevaluatedKeyword.uri, absoluteKeywordLocation: "https://example.com/max-unevaluated#/maxUnevaluated", instanceLocation: "" }
      ]);
    });

    test("plugins see the schemas it applies", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/by-type-plugin",
        propertiesByType: { number: { minimum: 0 } }
      }));

      /** @type string[] */
      const schemas = [];
      validator.validate({ a: 1, b: "x" }, {
        plugins: [{ beforeSchema: (schema, at) => schemas.push(`${schema.absoluteKeywordLocation} at '${at.instanceLocation}'`) }]
      });
      expect(schemas).to.eql([
        "https://example.com/by-type-plugin# at ''",
        "https://example.com/by-type-plugin#/propertiesByType/number at '/a'"
      ]);
    });

    test("annotates", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ propertiesByType: { number: true } }));

      const { output, node } = validator.annotate({ a: 1, b: "x", c: 2 });
      expect(output).to.equal(true);
      expect(node.data?.annotations?.get(propertiesByTypeKeyword.uri)).to.eql([["a", "c"]]);
    });

    test("what it marks counts for unevaluatedProperties", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { foo: true },
        propertiesByType: { number: true },
        unevaluatedProperties: false
      }));

      for (const validate of [
        (/** @type Json */ instance) => validator.validate(instance),
        (/** @type Json */ instance) => validator.validate(instance, { output: "BASIC" }).valid,
        (/** @type Json */ instance) => validator.validateJson(JSON.stringify(instance))
      ]) {
        expect(validate({ foo: "a", bar: 1 })).to.equal(true);
        expect(validate({ foo: "a", bar: "b" })).to.equal(false);
      }
    });

    test("what a failing subschema on the same instance marks doesn't count", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        firstOf: [{ properties: { b: true, c: { type: "number" } } }, { properties: { a: true, c: true } }],
        unevaluatedProperties: false
      }));

      for (const validate of [
        (/** @type Json */ instance) => validator.validate(instance),
        (/** @type Json */ instance) => validator.validateJson(JSON.stringify(instance))
      ]) {
        expect(validate({ b: 1, c: 1 })).to.equal(true);
        expect(validate({ a: 1, c: "x" })).to.equal(true);
        // The first marks `b` before `c` fails
        expect(validate({ a: 1, b: 1, c: "x" })).to.equal(false);
      }
    });

    test("what a failing expression that isn't a schema marks doesn't count", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        firstOfProperties: [{ b: true, c: { type: "number" } }, { a: true, c: true }],
        unevaluatedProperties: false
      }));

      for (const validate of [
        (/** @type Json */ instance) => validator.validate(instance),
        (/** @type Json */ instance) => validator.validateJson(JSON.stringify(instance))
      ]) {
        expect(validate({ b: 1, c: 1 })).to.equal(true);
        expect(validate({ a: 1, c: "x" })).to.equal(true);
        expect(validate({ a: 1, b: 1, c: "x" })).to.equal(false);
      }
    });

    test("schemas that apply themselves each have their own marks", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        propertiesByType: { object: { $ref: "#" } },
        unevaluatedProperties: false
      }));

      for (const validate of [
        (/** @type Json */ instance) => validator.validate(instance),
        (/** @type Json */ instance) => validator.validateJson(JSON.stringify(instance))
      ]) {
        expect(validate({ a: { b: {} } })).to.equal(true);
        expect(validate({ a: { b: {}, c: 1 } })).to.equal(false);
        // `a`'s `c` isn't the root's
        expect(validate({ a: { c: {} }, c: 1 })).to.equal(false);
      }
    });

    test("reads what its siblings marked", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        maxUnevaluated: 1,
        properties: { foo: true },
        propertiesByType: { boolean: true }
      }));

      for (const validate of [
        (/** @type Json */ instance) => validator.validate(instance),
        (/** @type Json */ instance) => validator.validateJson(JSON.stringify(instance))
      ]) {
        expect(validate({ foo: 1, bar: true, baz: 1 })).to.equal(true);
        expect(validate({ foo: 1, bar: 1, baz: 1 })).to.equal(false);
      }
    });

    test("reads the dynamic scope", async () => {
      const uri = await schemaFile({
        $id: "https://example.com/opaque-outer",
        $dynamicAnchor: "node",
        type: "object",
        $ref: "opaque-inner",
        $defs: {
          inner: {
            $id: "https://example.com/opaque-inner",
            $dynamicAnchor: "node",
            dynamicProperties: "node"
          }
        }
      });

      const outer = await jsonSchema.compile(uri);
      expect(outer.validate({ a: { b: {} } })).to.equal(true);
      expect(outer.validate({ a: { b: 1 } })).to.equal(false);
      expect(outer.validateJson(`{ "a": { "b": 1 } }`)).to.equal(false);

      const inner = await jsonSchema.compile(`${uri}#/$defs/inner`);
      expect(inner.validate({ a: { b: 1 } })).to.equal(true);
    });
  });

  describe("serialize", () => {
    test("a restored validator works without compiling", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { type: "number" } } }));
      const serialized = JSON.parse(JSON.stringify(validator.serialize()));

      const restored = jsonSchema.restoreValidator(serialized, { uri: validator.uri });
      expect(restored.uri).to.equal(validator.uri);
      expect(restored.validate({ foo: 1 })).to.equal(true);
      expect(restored.validate({ foo: "1" })).to.equal(false);
    });

    // A file's absolute URI says where the files are, and isn't the same on
    // another machine
    test("a schema in a file is serialized relative to it", async () => {
      const other = await schemaFile({ type: "number" });
      const otherName = other.slice(other.lastIndexOf("/") + 1);
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { $ref: otherName } } }));
      const serialized = /** @type Record<string, Json> */ (validator.serialize());

      expect(JSON.stringify(serialized)).not.to.contain("file:");
      expect(serialized.uri).to.equal("#");
      expect(Object.keys(/** @type object */ (serialized.schemas))).to.include.members(["#", "#/properties/foo", `${otherName}#`]);
    });

    test("it's restored wherever its files are now", async () => {
      const other = await schemaFile({ type: "number" });
      const otherName = other.slice(other.lastIndexOf("/") + 1);
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { $ref: otherName } } }));
      const serialized = JSON.parse(JSON.stringify(validator.serialize()));

      const moved = pathToFileURL(join(cwd(), "moved", "person.schema.json")).href;
      const restored = jsonSchema.restoreValidator(serialized, { uri: moved });
      expect(restored.uri).to.equal(`${moved}#`);
      const result = restored.validate({ foo: "x" }, { output: "BASIC" });
      expect(result.errors.map((error) => /** @type ValidationError */ (error).absoluteKeywordLocation)).to.eql([`${join("moved", otherName)}#/type`]);
    });

    test("without where it is, its URIs stay relative", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { type: "number" } } }));
      const restored = jsonSchema.restoreValidator(JSON.parse(JSON.stringify(validator.serialize())));

      expect(restored.uri).to.equal("#");
      expect(restored.validate({ foo: "x" }, { output: "BASIC" }).errors.map((error) => /** @type ValidationError */ (error).absoluteKeywordLocation)).to.eql(["#/properties/foo/type"]);
    });

    test("a schema that isn't a file is serialized as it is", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ $id: "https://example.com/serialized", type: "number" }));
      expect(/** @type Record<string, Json> */ (validator.serialize()).uri).to.equal("https://example.com/serialized#");
    });

    test("restoring needs the same keywords", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ type: "number" }));
      const serialized = validator.serialize();

      expect(() => new JsonSchema().restoreValidator(serialized)).to.throw("isn't supported");
    });

    test("a restored validator evaluates escape hatches", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ sorted: "ascending", propertiesByType: { array: { sorted: "descending" } } }));
      const serialized = JSON.parse(JSON.stringify(validator.serialize()));

      const restored = jsonSchema.restoreValidator(serialized);
      expect(restored.validate([1, 2])).to.equal(true);
      expect(restored.validate({ a: [2, 1] })).to.equal(true);
      expect(restored.validate({ a: [1, 2] })).to.equal(false);
    });

    test("restoring needs the keywords of escape hatches to have evaluate", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ sorted: "ascending" }));
      const serialized = validator.serialize();

      const other = new JsonSchema({ dialects: [testDialect], keywords: [...keywords, { ...sortedKeyword, evaluate: undefined }] });
      expect(() => other.restoreValidator(serialized)).to.throw("needs 'evaluate'");
    });

    test("a restored validator works out what its schemas read", async () => {
      const uri = await schemaFile({
        $id: "https://example.com/strict-node",
        $dynamicAnchor: "node",
        $ref: "node",
        unevaluatedProperties: false,
        $defs: {
          node: {
            $id: "https://example.com/node",
            $dynamicAnchor: "node",
            anyOf: [{ type: "null" }, { properties: { child: { $dynamicRef: "#node" } } }]
          }
        }
      });
      const validator = await jsonSchema.compile(uri);
      const serialized = /** @type Record<string, Json> */ (validator.serialize());

      const restored = jsonSchema.restoreValidator({ ...serialized, reads: { evaluated: [], dynamicScope: [] } });
      expect(restored.validate({ child: { child: null } })).to.equal(true);
      expect(restored.validate({ child: { extra: 1 } })).to.equal(false);
    });

    test("a compiled schema is in kernel version 1", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ type: "number" }));
      const serialized = /** @type Record<string, Json> */ (validator.serialize());

      expect(serialized.kernel).to.equal(1);
      expect(() => jsonSchema.restoreValidator({ ...serialized, kernel: 2 })).to.throw("kernel version 2");
      const withoutVersion = { ...serialized };
      delete withoutVersion.kernel;
      expect(() => jsonSchema.restoreValidator(withoutVersion)).to.throw("kernel version undefined");
    });
  });
});

/** @type <I>(context: EvaluateContext<I>) => OpaqueContext<I> */
const opaqueContext = (context) => {
  if (context.op !== "opaque") {
    throw Error("Expected an opaque operation");
  }
  return context;
};

/**
 * The test dialect names its keywords by URI. Their definitions are in the
 * config's `keywords`.
 *
 * @type DialectConfig
 */
const testDialect = {
  uri: dialectUri,
  keywords: {
    $id: idKeyword.uri,
    $anchor: anchorKeyword.uri,
    $dynamicAnchor: dynamicAnchorKeyword.uri,
    $defs: "https://example.com/keyword/defs",
    $ref: refKeyword.uri,
    $dynamicRef: dynamicRefKeyword.uri,
    type: typeKeyword.uri,
    minimum: minimumKeyword.uri,
    title: titleKeyword.uri,
    properties: propertiesKeyword.uri,
    patternProperties: patternPropertiesKeyword.uri,
    additionalProperties: additionalPropertiesKeyword.uri,
    required: requiredKeyword.uri,
    items: itemsKeyword.uri,
    minItems: minItemsKeyword.uri,
    uniqueItems: uniqueItemsKeyword.uri,
    allOf: allOfKeyword.uri,
    anyOf: anyOfKeyword.uri,
    if: ifKeyword.uri,
    then: "https://example.com/keyword/then",
    unevaluatedProperties: unevaluatedPropertiesKeyword.uri,
    unevaluatedItems: unevaluatedItemsKeyword.uri,
    sorted: sortedKeyword.uri,
    propertiesByType: propertiesByTypeKeyword.uri,
    firstOf: firstOfKeyword.uri,
    firstOfProperties: firstOfPropertiesKeyword.uri,
    sameAs: sameAsKeyword.uri,
    maxUnevaluated: maxUnevaluatedKeyword.uri,
    dynamicProperties: dynamicPropertiesKeyword.uri
  },
  unknownKeywords: "annotation"
};

/** @type (error: ValidationError) => Record<string, string> */
const locations = (error) => ({
  ruleId: error.ruleId,
  absoluteKeywordLocation: error.absoluteKeywordLocation,
  instanceLocation: error.instanceLocation
});

/** @type (error: DetailedValidationError) => unknown */
const detailedLocations = (error) => error.errors
  ? { ...locations(error), errors: error.errors.map(detailedLocations) }
  : locations(error);
