import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { fromJs, pointerGet, rejsonParse } from "@hyperjump/browser/json";
import { JsonSchema, extendDialect } from "../json-schema.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { draft202012Dialect } from "../dialects/draft-2020-12/index.js";
import { v1Dialect } from "../dialects/v1/index.js";
import { evaluatorForLint } from "./evaluate.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { Keyword } from "../keyword.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts"
 * @import { LintEvaluation } from "./evaluate.d.ts"
 */

const draft2020 = "https://json-schema.org/draft/2020-12/schema";
const v1 = "https://json-schema.org/v1";

// Whether a string is lowercase, as a predicate
/** @type Keyword<boolean> */
const lowercaseKeyword = {
  uri: "https://example.com/keyword/lowercase",
  shape: "data",
  lower: (value) => value
    ? { op: "predicate", keyword: "https://example.com/keyword/lowercase", value, types: ["string"] }
    : { op: "pass" },
  evaluate: (_value, { instance }) => (string) => {
    const value = /** @type string */ (instance.value(string));
    return value === value.toLowerCase();
  }
};

// Applies its schema, as an opaque operation
/** @type Keyword<Expression> */
const wrapKeyword = {
  uri: "https://example.com/keyword/wrap",
  shape: "schema",
  lower: (schema) => ({ op: "opaque", keyword: "https://example.com/keyword/wrap", value: null, schemas: [schema] }),
  evaluate: (_value, context) => {
    if (context.op !== "opaque") {
      throw Error("Expected an opaque operation");
    }
    const [schema] = context.schemas;
    return (instance) => schema(instance);
  }
};

describe("evaluatorForLint", () => {
  test("assertions", async () => {
    const evaluate = await evaluatorAt({ $schema: draft2020, type: "integer", minimum: 2, multipleOf: 2 });
    expect(evaluate(4).valid).to.equal(true);
    expect(evaluate(3).valid).to.equal(false);
    expect(evaluate(0).valid).to.equal(false);
    expect(evaluate("a").valid).to.equal(false);
  });

  test("a reference that can't be followed is unknown", async () => {
    const schema = { $schema: draft2020, $ref: "https://example.com/nope", type: "integer" };
    expect(await valid(schema, 1)).to.equal(undefined);
    expect(await valid(schema, "a")).to.equal(false);
  });

  test("a reference in the document", async () => {
    const schema = { $schema: draft2020, $defs: { a: { type: "string" } }, properties: { a: { $ref: "#/$defs/a" } } };
    expect(await valid(schema, { a: "x" })).to.equal(true);
    expect(await valid(schema, { a: 1 })).to.equal(false);
  });

  test("a schema that applies itself to the same instance is unknown there", async () => {
    expect(await valid({ $schema: draft2020, $ref: "#" }, 1)).to.equal(undefined);
    expect(await valid({ $schema: draft2020, $ref: "#", type: "string" }, 1)).to.equal(false);
    expect(await valid({ $schema: draft2020, items: { $ref: "#" }, type: "array" }, [[], [[]]])).to.equal(true);
  });

  test("a dynamic reference is unknown", async () => {
    expect(await valid({ $schema: draft2020, $dynamicAnchor: "a", $dynamicRef: "#a" }, 1)).to.equal(undefined);
  });

  test("anyOf with an unknown", async () => {
    const schema = { $schema: draft2020, anyOf: [{ $ref: "https://example.com/nope" }, { type: "string" }] };
    expect(await valid(schema, "a")).to.equal(true);
    expect(await valid(schema, 1)).to.equal(undefined);
  });

  test("oneOf with an unknown", async () => {
    const schema = { $schema: draft2020, oneOf: [{ $ref: "https://example.com/nope" }, { type: "string" }, { type: "string", minLength: 2 }] };
    expect(await valid(schema, "ab")).to.equal(false);
    expect(await valid(schema, "a")).to.equal(undefined);
    expect(await valid(schema, 1)).to.equal(undefined);
  });

  test("not of an unknown", async () => {
    expect(await valid({ $schema: draft2020, not: { $ref: "https://example.com/nope" } }, 1)).to.equal(undefined);
  });

  test("if with an unknown condition is known if then and else agree", async () => {
    const schema = { $schema: draft2020, if: { $ref: "https://example.com/nope" }, then: { type: "integer" }, else: { minimum: 0 } };
    expect(await valid(schema, 1)).to.equal(true);
    expect(await valid(schema, -1)).to.equal(undefined);
    expect(await valid(schema, -1.5)).to.equal(false);
  });

  test("contains with an unknown", async () => {
    const schema = { $schema: draft2020, contains: { anyOf: [{ $ref: "https://example.com/nope" }, { type: "string" }] }, maxContains: 1 };
    expect(await valid(schema, ["a"])).to.equal(true);
    expect(await valid(schema, [1])).to.equal(undefined);
    expect(await valid(schema, ["a", "b"])).to.equal(false);
    expect(await valid(schema, ["a", 1])).to.equal(undefined);
  });

  test("unevaluatedProperties reads what's marked", async () => {
    const schema = { $schema: draft2020, properties: { a: true }, unevaluatedProperties: false };
    expect(await valid(schema, { a: 1 })).to.equal(true);
    expect(await valid(schema, { b: 1 })).to.equal(false);
  });

  test("unevaluatedProperties with what might be marked", async () => {
    const schema = {
      $schema: draft2020,
      anyOf: [{ $ref: "https://example.com/nope" }, { properties: { a: true } }],
      unevaluatedProperties: false
    };
    expect(await valid(schema, { a: 1 })).to.equal(true);
    expect(await valid(schema, { b: 1 })).to.equal(undefined);
  });

  test("what an unknown schema marks might be marked", async () => {
    const schema = {
      $schema: draft2020,
      anyOf: [{ $ref: "https://example.com/nope", properties: { a: true } }, { type: "object" }],
      unevaluatedProperties: false
    };
    expect(await valid(schema, {})).to.equal(true);
    expect(await valid(schema, { a: 1 })).to.equal(undefined);
  });

  test("unevaluatedItems", async () => {
    const schema = { $schema: draft2020, prefixItems: [true], unevaluatedItems: { type: "string" } };
    expect(await valid(schema, [1, "a"])).to.equal(true);
    expect(await valid(schema, [1, 2])).to.equal(false);
  });

  test("itemPattern", async () => {
    const schema = { $schema: v1, itemPattern: [{ type: "string" }, { $ref: "https://example.com/nope" }, "*"] };
    expect(await valid(schema, ["a"])).to.equal(true);
    expect(await valid(schema, ["a", 1])).to.equal(undefined);
    expect(await valid(schema, [1])).to.equal(false);
  });

  test("a predicate", async () => {
    const schema = { $schema: draft2020, lowercase: true };
    expect(await valid(schema, "a")).to.equal(true);
    expect(await valid(schema, "A")).to.equal(false);
    expect(await valid(schema, 1)).to.equal(true);
  });

  test("an opaque operation is unknown", async () => {
    expect(await valid({ $schema: draft2020, wrap: { type: "string" } }, "a")).to.equal(undefined);
  });

  test("annotations", async () => {
    const evaluate = await evaluatorAt({ $schema: draft2020, anyOf: [{ type: "string", title: "a" }, { type: "number" }] });
    expect(evaluate("a")).to.eql({ valid: true, annotates: true, marks: false });
    expect(evaluate(1)).to.eql({ valid: true, annotates: false, marks: false });
  });

  test("marks", async () => {
    const evaluate = await evaluatorAt({ $schema: draft2020, properties: { a: { type: "string" } } });
    expect(evaluate({ a: "x" })).to.eql({ valid: true, annotates: false, marks: true });
    expect(evaluate({ b: "x" })).to.eql({ valid: true, annotates: false, marks: false });
  });

  test("a subschema", async () => {
    expect(await valid({ $schema: draft2020, properties: { a: { type: "string" } } }, 1, "/properties/a")).to.equal(false);
  });
});

/**
 * Evaluate a schema in a document, found by its JSON pointer, on a value
 *
 * @type (schema: object, pointer?: string) => Promise<(value: Json) => LintEvaluation>
 */
const evaluatorAt = async (schema, pointer = "") => {
  const jsonSchema = new JsonSchema({
    dialects: [extendDialect(draft202012Dialect, { keywords: { lowercase: lowercaseKeyword, wrap: wrapKeyword } }), v1Dialect]
  });
  const session = jsonSchema.session();

  const file = new VFile({ path: "/schemas/a.schema.json", value: JSON.stringify(schema) });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session });
  const tree = /** @type JsonSchemaDocumentNode */ (/** @type unknown */ (await processor.run(processor.parse(file), file)));
  const schemaNode = /** @type JsonSchemaNode */ (pointerGet(pointer, /** @type JsonSchemaNode */ (tree.children[0])));
  const evaluator = await evaluatorForLint(session, tree);

  return (value) => evaluator.schema(schemaNode, /** @type JsonSchemaTolerantNode */ (/** @type unknown */ (fromJs(value))));
};

/** @type (schema: object, value: Json, pointer?: string) => Promise<boolean | undefined> */
const valid = async (schema, value, pointer) => (await evaluatorAt(schema, pointer))(value).valid;
