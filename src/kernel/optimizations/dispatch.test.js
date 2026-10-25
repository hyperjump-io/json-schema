import { describe, test, expect } from "vitest";
import { fromJson } from "@hyperjump/browser/json";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { addV1, v1DialectUri } from "../../dialects/v1/index.js";
import { astInstance } from "../instance.js";
import { instrumented } from "../instrumented.js";
import dispatch from "./dispatch.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Kernel } from "../kernel.d.ts"
 * @import { Mode } from "../optimize.js"
 */

const jsonSchema = new JsonSchema();
addV1(jsonSchema);

const fast = { fast: true, plugins: false, annotations: false };

let count = 0;

/** @type (schema: Record<string, Json>) => Promise<import("../../json-schema.d.ts").Validator> */
const compile = async (schema) => {
  const uri = `https://example.com/schema-${count++}`;
  const registry = new SchemaRegistry([{ schema, retrievalUri: uri, dialectUri: v1DialectUri }]);
  return jsonSchema.compile(uri, { registries: [registry] });
};

/**
 * The expression of a keyword of the root schema after the pass, with each
 * schema it applies as the JSON pointer of the schema
 *
 * @type (schema: Record<string, Json>, keyword: string, mode?: Mode) => Promise<Json>
 */
const optimized = async (schema, keyword, mode = fast) => {
  const kernel = /** @type Kernel */ ((await compile(schema)).serialize());
  const root = dispatch.optimize(kernel, mode).get(kernel.uri) ?? kernel.schemas[kernel.uri];
  if (typeof root === "boolean") {
    throw Error("Expected an object schema");
  }

  const group = root.keywords.find(({ keywordUri }) => keywordUri.endsWith(`/${keyword}`));
  return JSON.parse(JSON.stringify(group?.expression), (key, value) => key === "schema" ? value.replace(/.*#/, "") : value);
};

describe("dispatch", () => {
  describe("any", () => {
    test("of schemas that only have a type is a typeIs with all their types", async () => {
      const expression = await optimized({ anyOf: [{ type: "boolean" }, { type: ["null", "boolean"] }] }, "anyOf");
      expect(expression).to.eql({ op: "typeIs", types: ["boolean", "null"] });
    });

    test("is kept if a schema has more than a type", async () => {
      const expression = await optimized({ anyOf: [{ type: "boolean" }, { type: "string", maxLength: 3 }] }, "anyOf");
      expect(expression).to.eql({ op: "any", of: [{ op: "apply", schema: "/anyOf/0" }, { op: "apply", schema: "/anyOf/1" }] });
    });

    test("is kept if a schema annotates and annotations can be seen", async () => {
      /** @type Record<string, Json> */
      const schema = { anyOf: [{ type: "boolean", title: "Yes or no" }, { type: "null" }] };
      expect(await optimized(schema, "anyOf", { fast: false, plugins: false, annotations: true })).to.include({ op: "any" });
      expect(await optimized(schema, "anyOf")).to.eql({ op: "typeIs", types: ["boolean", "null"] });
    });
  });

  describe("one", () => {
    test("of schemas with different types is a cases by type", async () => {
      const expression = await optimized({ oneOf: [{ type: ["string", "null"] }, { type: "object", required: ["foo"] }] }, "oneOf");
      expect(expression).to.eql({
        op: "cases",
        cases: [
          [{ op: "typeIs", types: ["string", "null"] }, { op: "apply", schema: "/oneOf/0" }],
          [{ op: "typeIs", types: ["object"] }, { op: "apply", schema: "/oneOf/1" }]
        ],
        otherwise: { op: "fail" }
      });
    });

    test("knows the types of const and enum", async () => {
      const expression = await optimized({ oneOf: [{ const: 1 }, { enum: ["a", "b"] }] }, "oneOf");
      expect(expression).to.include({ op: "cases" });
    });

    test("is kept if integer and number overlap", async () => {
      const expression = await optimized({ oneOf: [{ type: "integer" }, { type: "number", minimum: 3 }] }, "oneOf");
      expect(expression).to.include({ op: "one" });
    });

    test("is kept if a schema can pass any type", async () => {
      const expression = await optimized({ oneOf: [{ type: "string" }, { required: ["foo"] }] }, "oneOf");
      expect(expression).to.include({ op: "one" });
    });

    test("knows the types of a schema that applies itself from its other keywords", async () => {
      const expression = await optimized({ type: "object", oneOf: [{ type: "string" }, { $ref: "#" }] }, "oneOf");
      expect(expression).to.include({ op: "cases" });
    });

    test("is kept if a schema that applies itself has no other type", async () => {
      const expression = await optimized({ oneOf: [{ type: "string" }, { $ref: "#" }] }, "oneOf");
      expect(expression).to.include({ op: "one" });
    });

    test("leaves out a schema that can't pass", async () => {
      const expression = await optimized({ oneOf: [false, { type: "string" }] }, "oneOf");
      expect(expression).to.eql({ op: "apply", schema: "/oneOf/1" });
    });
  });

  test("dispatches for plugins too, which see only what's evaluated", async () => {
    const schema = { oneOf: [{ type: "string" }, { type: "object" }] };
    expect(await optimized(schema, "oneOf", { fast: false, plugins: true, annotations: false })).to.eql(await optimized(schema, "oneOf"));
  });

  describe("by tag", () => {
    /** @type (kind: Json, more?: Record<string, Json>) => Record<string, Json> */
    const tagged = (kind, more = {}) => ({
      type: "object",
      required: ["kind"],
      properties: { kind: Array.isArray(kind) ? { enum: kind } : { const: kind } },
      ...more
    });

    /** @type (name: string) => Json */
    const isParsed = (name) => ({ op: "not", of: { op: "property", name, of: { op: "fail" } } });
    const isObject = { op: "typeIs", types: ["object"] };

    test("a one of objects with a different value of a property is a cases by that value", async () => {
      const expression = await optimized({ oneOf: [tagged("a"), tagged("b")] }, "oneOf");
      expect(expression).to.eql({
        op: "cases",
        cases: [
          [isParsed("kind"), {
            op: "cases",
            cases: [
              [{ op: "propertyEquals", name: "kind", value: "a" }, { op: "apply", schema: "/oneOf/0" }],
              [{ op: "propertyEquals", name: "kind", value: "b" }, { op: "apply", schema: "/oneOf/1" }]
            ],
            otherwise: { op: "fail" }
          }],
          [{ op: "all", of: [isObject, { op: "hasProperty", name: "kind" }] }, {
            op: "one",
            of: [{ op: "apply", schema: "/oneOf/0" }, { op: "apply", schema: "/oneOf/1" }]
          }],
          [isObject, { op: "fail" }]
        ],
        otherwise: { op: "fail" }
      });
    });

    test("an any is dispatched the same way", async () => {
      const expression = await optimized({ anyOf: [tagged("a"), tagged("b")] }, "anyOf");
      expect(expression).to.deep.include({ op: "cases", otherwise: { op: "fail" } });
    });

    test("a value of an enum is a case of its own", async () => {
      const expression = /** @type any */ (await optimized({ oneOf: [tagged(["a", "b"]), tagged("c")] }, "oneOf"));
      expect(expression.cases[0][1].cases.map((/** @type any */ [condition, then]) => [condition.value, then.schema])).to.eql([
        ["a", "/oneOf/0"],
        ["b", "/oneOf/0"],
        ["c", "/oneOf/1"]
      ]);
    });

    test("a schema that doesn't constrain the property is in every case that has it", async () => {
      const expression = /** @type any */ (await optimized({
        oneOf: [tagged("a"), tagged("b"), { type: "object", required: ["kind", "other"] }]
      }, "oneOf"));
      expect(expression.cases[0][1].cases[0][1]).to.eql({ op: "one", of: [{ op: "apply", schema: "/oneOf/0" }, { op: "apply", schema: "/oneOf/2" }] });
      expect(expression.cases[0][1].otherwise).to.eql({ op: "apply", schema: "/oneOf/2" });
    });

    test("a schema that doesn't require the property is the case without it", async () => {
      const expression = /** @type any */ (await optimized({
        oneOf: [tagged("a"), tagged("b"), { type: "object", properties: { kind: { const: "c" } } }]
      }, "oneOf"));
      expect(expression.cases[2]).to.eql([isObject, { op: "apply", schema: "/oneOf/2" }]);
    });

    test("a schema that can pass other types than objects is what's left", async () => {
      const expression = /** @type any */ (await optimized({ oneOf: [tagged("a"), tagged("b"), { type: "string" }] }, "oneOf"));
      expect(expression.otherwise).to.eql({ op: "apply", schema: "/oneOf/2" });
    });

    test("schemas that can pass any type are what's left too, by type", async () => {
      const expression = /** @type any */ (await optimized({
        oneOf: [{ required: ["kind"], properties: { kind: { const: "a" } } }, { required: ["kind"], properties: { kind: { const: "b" } } }]
      }, "oneOf"));
      expect(expression.otherwise).to.eql({ op: "one", of: [{ op: "apply", schema: "/oneOf/0" }, { op: "apply", schema: "/oneOf/1" }] });
    });

    test("closed objects that require different properties are cases by the property they have", async () => {
      const expression = await optimized({
        oneOf: [
          { type: "object", required: ["eq"], properties: { eq: true }, additionalProperties: false },
          { type: "object", required: ["gt"], properties: { gt: true }, additionalProperties: false }
        ]
      }, "oneOf");
      expect(expression).to.eql({
        op: "cases",
        cases: [
          [isParsed("eq"), { op: "apply", schema: "/oneOf/0" }],
          [isParsed("gt"), { op: "apply", schema: "/oneOf/1" }],
          [{ op: "all", of: [isObject, { op: "any", of: [{ op: "hasProperty", name: "eq" }, { op: "hasProperty", name: "gt" }] }] }, {
            op: "one",
            of: [{ op: "apply", schema: "/oneOf/0" }, { op: "apply", schema: "/oneOf/1" }]
          }],
          [isObject, { op: "fail" }]
        ],
        otherwise: { op: "fail" }
      });
    });

    test("is kept if every case would evaluate every schema", async () => {
      const expression = await optimized({
        oneOf: [{ type: "object", required: ["kind"] }, { type: "object", required: ["kind"], maxProperties: 1 }]
      }, "oneOf");
      expect(expression).to.include({ op: "one" });
    });

    test("knows the tags of schemas it applies", async () => {
      const expression = await optimized({
        $defs: { a: tagged("a"), b: { allOf: [tagged("b")] } },
        oneOf: [{ $ref: "#/$defs/a" }, { $ref: "#/$defs/b" }]
      }, "oneOf");
      expect(expression).to.include({ op: "cases" });
    });

    test("knows the tags of a schema that applies itself", async () => {
      const expression = await optimized({
        $defs: {
          leaf: tagged("leaf"),
          branch: tagged("branch", { properties: { kind: { const: "branch" }, children: { items: { $ref: "#" } } } })
        },
        oneOf: [{ $ref: "#/$defs/leaf" }, { $ref: "#/$defs/branch" }]
      }, "oneOf");
      expect(expression).to.include({ op: "cases" });
    });
  });

  describe("evaluated", () => {
    /**
     * Evaluate JSON text, which can have values that couldn't be parsed,
     * with the kernel as it's compiled and after the pass
     *
     * @type (schema: Record<string, Json>, json: string) => Promise<[boolean, boolean]>
     */
    const both = async (schema, json) => {
      const validator = await compile(schema);
      const kernel = /** @type Kernel */ (validator.serialize());
      const replaced = dispatch.optimize(kernel, fast);
      expect(replaced.size).to.be.greaterThan(0);
      const after = { ...kernel, schemas: { ...kernel.schemas, ...Object.fromEntries(replaced) } };
      const options = { instance: astInstance, isAst: true, annotating: false, instrumented: false };
      const { node } = fromJson(json);
      return [instrumented(jsonSchema, kernel, options)(node), instrumented(jsonSchema, after, options)(node)];
    };

    /** @type Record<string, Json> & { oneOf: Json[] } */
    const tags = {
      oneOf: [
        { type: "object", required: ["kind"], properties: { kind: { const: "a" }, a: { type: "number" } } },
        { type: "object", required: ["kind"], properties: { kind: { const: "b" }, b: { type: "number" } } },
        { type: "string" }
      ]
    };

    test("a tag gets the result of the schemas that can pass it", async () => {
      const validator = await compile(tags);
      /** @type Json[] */
      const instances = [{ kind: "a", a: 1 }, { kind: "a", a: "x" }, { kind: "b", b: 1 }, { kind: "c" }, { a: 1 }, "x", 1];
      expect(instances.map((instance) => validator.validate(instance))).to.eql([true, false, true, false, false, true, false]);
    });

    test("a tag is compared as JSON", async () => {
      const validator = await compile({
        oneOf: [
          { type: "object", required: ["kind"], properties: { kind: { const: 1 } }, maxProperties: 1 },
          { type: "object", required: ["kind"], properties: { kind: { const: "1" } }, minProperties: 2 }
        ]
      });
      /** @type Json[] */
      const instances = [{ kind: 1.0 }, { kind: "1" }, { kind: "1", more: true }, { kind: true }];
      expect(instances.map((instance) => validator.validate(instance))).to.eql([true, false, true, false]);
    });

    test("a tag that couldn't be parsed gets every schema, as before", async () => {
      expect(await both(tags, `{ "kind": , "a": 1 }`)).to.eql([false, false]);
      expect(await both({ oneOf: tags.oneOf.slice(0, 2), properties: { kind: true } }, `{ "kind": , "b": "x" }`)).to.eql([true, true]);
    });

    test("a key that couldn't be parsed doesn't decide", async () => {
      /** @type Record<string, Json> */
      const keys = {
        oneOf: [
          { type: "object", required: ["eq"], properties: { eq: true }, additionalProperties: false },
          { type: "object", required: ["gt"], properties: { gt: true }, additionalProperties: false }
        ]
      };
      expect(await both(keys, `{ "eq": , "gt": 1 }`)).to.eql([true, true]);
      expect(await both(keys, `{ "eq": 1, "gt": 1 }`)).to.eql([false, false]);
    });

    test("keeps the marks of the schema for the tag", async () => {
      const validator = await compile({ ...tags, unevaluatedProperties: false });
      /** @type Json[] */
      const instances = [{ kind: "a", a: 1 }, { kind: "a", b: 1 }];
      expect(instances.map((instance) => validator.validate(instance))).to.eql([true, false]);
    });

    test("BASIC has the errors of the schema for the tag", async () => {
      const validator = await compile(tags);
      const result = validator.validate({ kind: "b", b: "x" }, { output: "BASIC" });
      expect(result.errors.map((error) => /** @type any */ (error).absoluteKeywordLocation.replace(/.*#/, ""))).to.eql(["/oneOf", "/oneOf/1/properties/b/type"]);
    });

    test("each type gets its own schema's result", async () => {
      const validator = await compile({ oneOf: [{ type: "integer" }, { type: "string", maxLength: 1 }] });
      expect([1, 1.5, "a", "ab", null, {}].map((instance) => validator.validate(instance))).to.eql([true, false, true, false, false, false]);
    });

    test("keeps the marks of the schema for the type", async () => {
      const validator = await compile({
        oneOf: [{ type: "string" }, { type: "object", properties: { foo: true } }],
        unevaluatedProperties: false
      });
      /** @type Json[] */
      const instances = [{ foo: 1 }, { bar: 1 }, "a"];
      expect(instances.map((instance) => validator.validate(instance))).to.eql([true, false, true]);
    });
  });
});
