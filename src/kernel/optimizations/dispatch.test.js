import { describe, test, expect } from "vitest";
import { fromJson } from "@hyperjump/browser";
import { jsonSchemaMediaTypes } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { v1Dialect, v1DialectUri } from "../../dialects/v1/index.js";
import { astInstance, jsInstance } from "../instance.js";
import { instrumented } from "../instrumented.js";
import { kernelDefinitions } from "../definitions.js";
import dispatch from "./dispatch.js";
import { BASIC } from "../../output/index.js";
import { compile as compileSchema, restore, serialize } from "../../operations/compile.js";
import { validatorFor } from "../../operations/validate-compiled.js";
import { noUrl } from "../../identifiers.js";
import { definitionsOf } from "../../definition-of.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { KernelSchema, Expression, Handle, Kernel } from "../kernel.d.ts"
 * @import { Mode } from "../optimize.js"
 */

const jsonSchema = { mediaTypes: jsonSchemaMediaTypes({ dialects: [v1Dialect] }) };

const fast = { fast: true, plugins: false, annotations: false };

let count = 0;

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
    test("of schemas with different types is a typeSwitch", async () => {
      const expression = await optimized({ oneOf: [{ type: ["string", "null"] }, { type: "object", required: ["foo"] }] }, "oneOf");
      expect(expression).to.eql({
        op: "typeSwitch",
        cases: {
          string: { op: "apply", schema: "/oneOf/0" },
          null: { op: "apply", schema: "/oneOf/0" },
          object: { op: "apply", schema: "/oneOf/1" }
        },
        otherwise: { op: "fail" }
      });
    });

    test("knows the types of const and enum", async () => {
      const expression = await optimized({ oneOf: [{ const: 1 }, { enum: ["a", "b"] }] }, "oneOf");
      expect(expression).to.include({ op: "typeSwitch" });
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
      expect(expression).to.include({ op: "typeSwitch" });
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

  test("dispatches the schemas of an opaque operation", () => {
    /** @type Expression */
    const one = { op: "one", of: [{ op: "typeIs", types: ["string"] }, { op: "typeIs", types: ["object"] }] };
    /** @type Kernel */
    const kernel = {
      kernel: 1,
      uri: "https://example.com/opaque",
      schemas: {
        "https://example.com/opaque": {
          resource: "https://example.com/opaque",
          keywords: [{
            keywordUri: "https://example.com/keyword",
            location: "https://example.com/opaque#/keyword",
            sources: [],
            expression: { op: "opaque", keyword: "https://example.com/keyword", value: null, schemas: [one] }
          }]
        }
      },
      resources: { "https://example.com/opaque": { dynamicAnchors: {} } },
      reads: { evaluated: [], dynamicScope: [] }
    };
    const root = /** @type Exclude<KernelSchema, boolean> */ (dispatch.optimize(kernel, fast).get(kernel.uri));
    const opaque = /** @type Extract<Expression, { op: "opaque" }> */ (root.keywords[0].expression);
    expect(opaque.schemas[0]).to.include({ op: "typeSwitch" });
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
      properties: { kind: { [Array.isArray(kind) ? "enum" : "const"]: kind } },
      ...more
    });

    /** @type (forObjects: Json, otherwise?: Json) => Json */
    const objects = (forObjects, otherwise = { op: "fail" }) => ({ op: "typeSwitch", cases: { object: forObjects }, otherwise });

    test("a one of objects with a different value of a property is a propertySwitch", async () => {
      const expression = await optimized({ oneOf: [tagged("a"), tagged("b")] }, "oneOf");
      expect(expression).to.eql(objects({
        op: "propertySwitch",
        name: "kind",
        cases: [["a", { op: "apply", schema: "/oneOf/0" }], ["b", { op: "apply", schema: "/oneOf/1" }]],
        other: { op: "fail" },
        absent: { op: "fail" },
        unparsed: { op: "one", of: [{ op: "apply", schema: "/oneOf/0" }, { op: "apply", schema: "/oneOf/1" }] }
      }));
    });

    test("an any is dispatched the same way", async () => {
      const expression = /** @type any */ (await optimized({ anyOf: [tagged("a"), tagged("b")] }, "anyOf"));
      expect(expression.cases.object).to.include({ op: "propertySwitch" });
    });

    test("a value of an enum is a case of its own", async () => {
      const expression = /** @type any */ (await optimized({ oneOf: [tagged(["a", "b"]), tagged("c")] }, "oneOf"));
      expect(expression.cases.object.cases.map((/** @type any */ [value, then]) => [value, then.schema])).to.eql([
        ["a", "/oneOf/0"],
        ["b", "/oneOf/0"],
        ["c", "/oneOf/1"]
      ]);
    });

    test("a schema that doesn't constrain the property is in every case that has it", async () => {
      const expression = /** @type any */ (await optimized({
        oneOf: [tagged("a"), tagged("b"), { type: "object", required: ["kind", "other"] }]
      }, "oneOf"));
      expect(expression.cases.object.cases[0][1]).to.eql({ op: "one", of: [{ op: "apply", schema: "/oneOf/0" }, { op: "apply", schema: "/oneOf/2" }] });
      expect(expression.cases.object.other).to.eql({ op: "apply", schema: "/oneOf/2" });
    });

    test("a schema that doesn't require the property is the case without it", async () => {
      const expression = /** @type any */ (await optimized({
        oneOf: [tagged("a"), tagged("b"), { type: "object", properties: { kind: { const: "c" } } }]
      }, "oneOf"));
      expect(expression.cases.object.absent).to.eql({ op: "apply", schema: "/oneOf/2" });
    });

    test("a property none of them requires is a tag, and without it, they're all evaluated", async () => {
      /** @type (kind: string) => Record<string, Json> */
      const optional = (kind) => ({ type: "object", properties: { kind: { const: kind } } });
      const expression = /** @type any */ (await optimized({ anyOf: [optional("a"), optional("b"), optional("c")] }, "anyOf"));
      const all = { op: "any", of: [{ op: "apply", schema: "/anyOf/0" }, { op: "apply", schema: "/anyOf/1" }, { op: "apply", schema: "/anyOf/2" }] };
      expect(expression.cases.object).to.include({ op: "propertySwitch", name: "kind" });
      expect(expression.cases.object.cases[1]).to.eql(["b", { op: "apply", schema: "/anyOf/1" }]);
      expect(expression.cases.object.other).to.eql({ op: "fail" });
      expect(expression.cases.object.absent).to.eql(all);
    });

    test("a schema that can pass other types than objects is what's left", async () => {
      const expression = /** @type any */ (await optimized({ oneOf: [tagged("a"), tagged("b"), { type: "string" }] }, "oneOf"));
      expect(expression.otherwise).to.eql({ op: "apply", schema: "/oneOf/2" });
    });

    test("schemas that are dispatched by type are merged into one typeSwitch", async () => {
      const expression = /** @type any */ (await optimized({
        oneOf: [tagged("a"), tagged("b"), { type: "string" }, { type: "number" }]
      }, "oneOf"));
      expect(Object.keys(expression.cases).toSorted()).to.eql(["number", "object", "string"]);
      expect(expression.otherwise).to.eql({ op: "fail" });
    });

    test("schemas that can pass any type are what's left too", async () => {
      const expression = /** @type any */ (await optimized({
        oneOf: [{ required: ["kind"], properties: { kind: { const: "a" } } }, { required: ["kind"], properties: { kind: { const: "b" } } }]
      }, "oneOf"));
      expect(expression.otherwise).to.eql({ op: "one", of: [{ op: "apply", schema: "/oneOf/0" }, { op: "apply", schema: "/oneOf/1" }] });
    });

    test("closed objects that require different properties are a keySwitch", async () => {
      const expression = await optimized({
        oneOf: [
          { type: "object", required: ["eq"], properties: { eq: true }, additionalProperties: false },
          { type: "object", required: ["gt"], properties: { gt: true }, additionalProperties: false }
        ]
      }, "oneOf");
      expect(expression).to.eql(objects({
        op: "keySwitch",
        cases: [["eq", { op: "apply", schema: "/oneOf/0" }], ["gt", { op: "apply", schema: "/oneOf/1" }]],
        none: { op: "fail" },
        unparsed: { op: "one", of: [{ op: "apply", schema: "/oneOf/0" }, { op: "apply", schema: "/oneOf/1" }] }
      }));
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
      expect(expression).to.include({ op: "typeSwitch" });
    });

    test("knows the tags of a schema that applies itself", async () => {
      const expression = await optimized({
        $defs: {
          leaf: tagged("leaf"),
          branch: tagged("branch", { properties: { kind: { const: "branch" }, children: { items: { $ref: "#" } } } })
        },
        oneOf: [{ $ref: "#/$defs/leaf" }, { $ref: "#/$defs/branch" }]
      }, "oneOf");
      expect(expression).to.include({ op: "typeSwitch" });
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
      const compiled = await compile(schema);
      const kernel = /** @type Kernel */ (serialize(compiled));
      // Dispatching doesn't remove schemas
      const replaced = /** @type Map<Handle, KernelSchema> */ (dispatch.optimize(kernel, fast));
      expect(replaced.size).to.be.greaterThan(0);
      const after = { ...kernel, schemas: { ...kernel.schemas, ...Object.fromEntries(replaced) } };
      const options = { instance: astInstance, isAst: true, annotating: false, instrumented: false };
      const { node } = fromJson(json, noUrl);
      const definitions = kernelDefinitions(definitionsOf(jsonSchema), kernel);
      return [instrumented(definitions, kernel, options)(node), instrumented(definitions, after, options)(node)];
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
      const compiled = await compile(tags);
      /** @type Json[] */
      const instances = [{ kind: "a", a: 1 }, { kind: "a", a: "x" }, { kind: "b", b: 1 }, { kind: "c" }, { a: 1 }, "x", 1];
      expect(instances.map((instance) => validatorFor(compiled)(instance))).to.eql([true, false, true, false, false, true, false]);
    });

    test("a tag is compared as JSON", async () => {
      const compiled = await compile({
        oneOf: [
          { type: "object", required: ["kind"], properties: { kind: { const: 1 } }, maxProperties: 1 },
          { type: "object", required: ["kind"], properties: { kind: { const: "1" } }, minProperties: 2 }
        ]
      });
      /** @type Json[] */
      const instances = [{ kind: 1.0 }, { kind: "1" }, { kind: "1", more: true }, { kind: true }];
      expect(instances.map((instance) => validatorFor(compiled)(instance))).to.eql([true, false, true, false]);
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

    test("the switches mean the same to every evaluator", async () => {
      const kernel = /** @type Kernel */ (serialize((await compile({ type: "object" }))));
      /** @type (expression: Expression) => Kernel */
      const withRoot = (expression) => {
        const root = /** @type Exclude<Kernel["schemas"][string], boolean> */ (kernel.schemas[kernel.uri]);
        return { ...kernel, schemas: { ...kernel.schemas, [kernel.uri]: { ...root, keywords: [{ ...root.keywords[0], expression }] } } };
      };
      /** @type (expression: Expression, jsons: string[]) => boolean[][] */
      const results = (expression, jsons) => {
        const parsed = jsons.filter((json) => !/: [,}]/.test(json));
        const evaluations = [
          parsed.map((json) => validatorFor(restore(jsonSchema, withRoot(expression)))(JSON.parse(json)))
        ];
        for (const [instance, isAst] of /** @type const */ ([[astInstance, true], [jsInstance, false]])) {
          const evaluate = instrumented(kernelDefinitions(definitionsOf(jsonSchema), withRoot(expression)), withRoot(expression), /** @type any */ ({ instance, isAst, annotating: false, instrumented: false }));
          evaluations.push((isAst ? jsons : parsed).map((json) => evaluate(isAst ? fromJson(json, noUrl).node : JSON.parse(json))));
        }
        return evaluations;
      };

      /** @type Expression */
      const propertySwitch = {
        op: "propertySwitch",
        name: "kind",
        cases: [["a", { op: "fail" }], ["b", { op: "pass" }], [1, { op: "pass" }], ["b", { op: "fail" }]],
        other: { op: "propertyCount", max: 1 },
        absent: { op: "fail" },
        unparsed: { op: "propertyCount", min: 2 }
      };
      const jsons = [`{ "kind": "a" }`, `{ "kind": "b" }`, `{ "kind": 1.0 }`, `{ "kind": "1", "x": 1 }`, `{ "kind": {} }`, `{}`, `"a"`, `[]`, `{ "kind": }`, `{ "kind": , "x": 1 }`];
      const expected = [false, true, true, false, true, false, true, true, false, true];
      const parsed = expected.slice(0, -2);
      expect(results(propertySwitch, jsons)).to.eql([parsed, expected, parsed]);

      /** @type Expression */
      const keySwitch = {
        op: "keySwitch",
        cases: [["a", { op: "propertyCount", max: 1 }], ["b", { op: "pass" }]],
        none: { op: "fail" },
        unparsed: { op: "propertyCount", min: 3 }
      };
      const keyJsons = [`{ "a": 1 }`, `{ "a": 1, "b": 1 }`, `{ "b": 1, "c": 1 }`, `{ "c": 1 }`, `"a"`, `{ "a": , "b": 1, "c": 1 }`, `{ "a": , "b": , "c": 1 }`, `{ "a": }`];
      const keyExpected = [true, false, true, false, true, true, true, false];
      const keyParsed = keyExpected.slice(0, -3);
      expect(results(keySwitch, keyJsons)).to.eql([keyParsed, keyExpected, keyParsed]);

      /** @type Expression */
      const typeSwitch = { op: "typeSwitch", cases: { string: { op: "fail" }, number: { op: "pass" } }, otherwise: { op: "typeIs", types: ["null"] } };
      const typeJsons = [`"a"`, `1`, `1.5`, `null`, `{}`, `[]`];
      const typeExpected = [false, true, true, true, false, false];
      expect(results(typeSwitch, typeJsons)).to.eql([typeExpected, typeExpected, typeExpected]);
    });

    test("keeps the marks of the schema for the tag", async () => {
      const compiled = await compile({ ...tags, unevaluatedProperties: false });
      /** @type Json[] */
      const instances = [{ kind: "a", a: 1 }, { kind: "a", b: 1 }];
      expect(instances.map((instance) => validatorFor(compiled)(instance))).to.eql([true, false]);
    });

    test("BASIC has the errors of the schema for the tag", async () => {
      const compiled = await compile(tags);
      const result = validatorFor(compiled, { output: BASIC })({ kind: "b", b: "x" });
      expect(result.errors.map((error) => /** @type any */ (error).absoluteKeywordLocation.replace(/.*#/, ""))).to.eql(["/oneOf", "/oneOf/1/properties/b/type"]);
    });

    test("each type gets its own schema's result", async () => {
      const compiled = await compile({ oneOf: [{ type: "integer" }, { type: "string", maxLength: 1 }] });
      expect([1, 1.5, "a", "ab", null, {}].map((instance) => validatorFor(compiled)(instance))).to.eql([true, false, true, false, false, false]);
    });

    test("keeps the marks of the schema for the type", async () => {
      const compiled = await compile({
        oneOf: [{ type: "string" }, { type: "object", properties: { foo: true } }],
        unevaluatedProperties: false
      });
      /** @type Json[] */
      const instances = [{ foo: 1 }, { bar: 1 }, "a"];
      expect(instances.map((instance) => validatorFor(compiled)(instance))).to.eql([true, false, true]);
    });
  });
});

/** @type (schema: Record<string, Json>) => Promise<import("../../operations/compile.d.ts").CompiledSchema> */
const compile = async (schema) => {
  const uri = `https://example.com/schema-${count++}`;
  const registry = new SchemaRegistry([{ schema, retrievalUri: uri, dialectUri: v1DialectUri }]);
  return compileSchema(jsonSchema, uri, { registry });
};

/**
 * The expression of a keyword of the root schema after the pass, with each
 * schema it applies as the JSON pointer of the schema
 *
 * @type (schema: Record<string, Json>, keyword: string, mode?: Mode) => Promise<Json>
 */
const optimized = async (schema, keyword, mode = fast) => {
  const kernel = /** @type Kernel */ (serialize((await compile(schema))));
  const root = dispatch.optimize(kernel, mode).get(kernel.uri) ?? kernel.schemas[kernel.uri];
  if (typeof root === "boolean") {
    throw Error("Expected an object schema");
  }

  const group = root.keywords.find(({ keywordUri }) => keywordUri.endsWith(`/${keyword}`));
  return JSON.parse(JSON.stringify(group?.expression), (key, value) => key === "schema" ? value.replace(/.*#/, "") : value);
};
