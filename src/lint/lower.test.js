import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { pointerGet, rejsonParse } from "@hyperjump/browser";
import { JsonSchema } from "../json-schema.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { draft04Dialect } from "../dialects/draft-04/index.js";
import { draft07Dialect } from "../dialects/draft-07/index.js";
import { draft201909Dialect } from "../dialects/draft-2019-09/index.js";
import { draft202012Dialect } from "../dialects/draft-2020-12/index.js";
import { appliesTo, assertsOnItsOwn, keywordAppliesTo } from "./analysis.js";
import { documentForLint } from "./document.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { LintDocument } from "./document.d.ts"
 * @import { LoweredKeyword } from "./lower.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

const draft04 = "http://json-schema.org/draft-04/schema#";
const draft07 = "http://json-schema.org/draft-07/schema#";
const draft2019 = "https://json-schema.org/draft/2019-09/schema";
const draft2020 = "https://json-schema.org/draft/2020-12/schema";

describe("LintDocument.schemas", () => {
  test("keywords are in the order they're in the schema", async () => {
    const { at } = await lower(JSON.stringify({ $schema: draft2020, unevaluatedProperties: false, properties: { a: true } }));
    expect(at("").map(({ keywordNode }) => keywordNode.children[0].value)).to.eql(["unevaluatedProperties", "properties"]);
  });

  test("a subschema is apply of its location, and a reference of what it resolves to", async () => {
    const { at } = await lower(JSON.stringify({ $schema: draft2020, not: { $ref: "#/$defs/a" }, $defs: { a: {} } }));
    expect(expressions(at(""))).to.eql([["not", { op: "not", of: { op: "apply", schema: "file:///schemas/a.schema.json#/not" } }]]);
    expect(expressions(at("/not"))).to.eql([["$ref", { op: "apply", schema: "file:///schemas/a.schema.json#/$defs/a" }]]);
  });

  test("a schema that's a reference is apply of what it resolves to", async () => {
    const { at } = await lower(JSON.stringify({ $schema: draft07, not: { $ref: "#/definitions/a" }, definitions: { a: {} } }));
    expect(expressions(at(""))).to.eql([["not", { op: "not", of: { op: "apply", schema: "file:///schemas/a.schema.json#/definitions/a" } }]]);
  });

  test("a dynamic reference into a resource in the document", async () => {
    const { at } = await lower(JSON.stringify({
      $schema: draft2020,
      $dynamicAnchor: "a",
      properties: {
        foo: { $dynamicRef: "#a" },
        bar: { $dynamicRef: "#/$defs/b" }
      },
      $defs: { b: {} }
    }));
    expect(expressions(at("/properties/foo"))).to.eql([["$dynamicRef", { op: "dynamicApply", anchor: "a", fallback: "file:///schemas/a.schema.json#a" }]]);
    expect(expressions(at("/properties/bar"))).to.eql([["$dynamicRef", { op: "apply", schema: "file:///schemas/a.schema.json#/$defs/b" }]]);
  });

  test("a dynamic reference into a resource that isn't in the document might use the dynamic scope", async () => {
    const { at } = await lower(JSON.stringify({
      $schema: draft2020,
      properties: {
        foo: { $dynamicRef: "https://example.com/other#a" },
        bar: { $dynamicRef: "https://example.com/other#/$defs/b" }
      }
    }));
    expect(expressions(at("/properties/foo"))).to.eql([["$dynamicRef", { op: "dynamicApply", anchor: "a", fallback: "https://example.com/other#a" }]]);
    expect(expressions(at("/properties/bar"))).to.eql([["$dynamicRef", { op: "apply", schema: "https://example.com/other#/$defs/b" }]]);
  });

  test("a recursive reference", async () => {
    const { at } = await lower(JSON.stringify({
      $schema: draft2019,
      $recursiveAnchor: true,
      properties: {
        foo: { $recursiveRef: "#" },
        bar: { $recursiveRef: "https://example.com/other" }
      }
    }));
    expect(expressions(at("/properties/foo"))).to.eql([["$recursiveRef", { op: "dynamicApply", anchor: "", fallback: "file:///schemas/a.schema.json#" }]]);
    expect(expressions(at("/properties/bar"))).to.eql([["$recursiveRef", { op: "dynamicApply", anchor: "", fallback: "https://example.com/other" }]]);
  });

  test("a keyword whose value doesn't fit its shape has no group", async () => {
    const { at } = await lower(`{ "$schema": "${draft2020}", "maximum": "x", "properties": [1], "minimum": 1 }`);
    expect(expressions(at(""))).to.eql([["minimum", { op: "range", min: 1 }]]);
  });

  test("a sibling whose value doesn't fit its shape is left out", async () => {
    const { at } = await lower(`{ "$schema": "${draft04}", "maximum": 5, "exclusiveMaximum": "x" }`);
    const [maximum] = at("");
    expect(maximum.group.expression).to.eql({ op: "range", max: 5 });
    expect(maximum.sourceNodes).to.eql([]);
  });

  test("a keyword with its default value lowers to the same as without it", async () => {
    const { at } = await lower(JSON.stringify({
      $schema: draft2020,
      minLength: 0,
      minItems: 0,
      minProperties: 0,
      readOnly: false,
      writeOnly: false,
      deprecated: false
    }));
    expect(at("").map(({ group }) => group.expression)).to.eql(Array(6).fill({ op: "pass" }));
  });

  test("a draft-04 limit that's not exclusive", async () => {
    const { at } = await lower(JSON.stringify({ $schema: draft04, minimum: 1, exclusiveMinimum: false }));
    expect(expressions(at(""))).to.eql([["minimum", { op: "range", min: 1 }]]);
  });

  test("a keyword without lower has no group", async () => {
    const { at } = await lower(JSON.stringify({ $schema: draft2020, $defs: { a: {} } }));
    expect(at("")).to.eql([]);
  });

  test("the siblings a keyword read", async () => {
    const { at, keyword } = await lower(JSON.stringify({ $schema: draft04, maximum: 5, exclusiveMaximum: true }));
    const [maximum] = at("");
    expect(maximum.sourceNodes).to.eql([keyword("", "exclusiveMaximum")]);
    expect(maximum.group.sources).to.eql(["file:///schemas/a.schema.json#/exclusiveMaximum"]);
  });

  test("a field that's different without a sibling came from it", async () => {
    const { at, keyword } = await lower(JSON.stringify({ $schema: draft04, maximum: 5, exclusiveMaximum: true }));
    const [{ group, cameFrom }] = at("");
    expect(cameFrom(group.expression)).to.eql([keyword("", "maximum")]);
    expect(cameFrom(group.expression, "max")).to.eql([keyword("", "maximum")]);
    expect(cameFrom(group.expression, "exclusiveMax")).to.eql([keyword("", "exclusiveMaximum")]);
  });

  test("each sibling's field, whatever order they're in", async () => {
    const { at, keyword } = await lower(JSON.stringify({ $schema: draft2020, maxContains: 2, contains: {}, minContains: 3 }));
    const [{ group, cameFrom }] = at("");
    expect(cameFrom(group.expression, "min")).to.eql([keyword("", "minContains")]);
    expect(cameFrom(group.expression, "max")).to.eql([keyword("", "maxContains")]);
    expect(cameFrom(group.expression, "of")).to.eql([keyword("", "contains")]);
  });

  test("nothing came from a sibling with its default value", async () => {
    const { at, keyword } = await lower(JSON.stringify({ $schema: draft2020, contains: {}, minContains: 1 }));
    const [{ group, cameFrom }] = at("");
    expect(cameFrom(group.expression, "min")).to.eql([keyword("", "contains")]);
  });

  test("an operation that isn't there without a sibling came from both", async () => {
    const { at, keyword } = await lower(JSON.stringify({ $schema: draft2019, items: [{}], additionalItems: false }));
    const { group, cameFrom } = at("")[1];
    expect(cameFrom(group.expression)).to.eql([keyword("", "items"), keyword("", "additionalItems")]);
  });

  test("a nested operation", async () => {
    const { at, keyword } = await lower(JSON.stringify({ $schema: draft2020, if: {}, then: {}, else: {} }));
    const [{ group, cameFrom }] = at("");
    const cases = /** @type {{ cases: [Expression, Expression][]; otherwise: Expression }} */ (/** @type unknown */ (group.expression));
    const [[condition, then]] = cases.cases;
    expect(cameFrom(condition)).to.eql([keyword("", "if")]);
    expect(cameFrom(then)).to.eql([keyword("", "if"), keyword("", "then")]);
    expect(cameFrom(cases.otherwise)).to.eql([keyword("", "if"), keyword("", "else")]);
  });

  test("a sibling that changes what's selected", async () => {
    const { at, keyword } = await lower(JSON.stringify({ $schema: draft2020, patternProperties: { "^a": {} }, additionalProperties: false, properties: { b: {} } }));
    const { group, cameFrom } = at("")[1];
    expect(cameFrom(group.expression, "select")).to.eql([keyword("", "patternProperties"), keyword("", "properties")]);
    expect(cameFrom(group.expression, "of")).to.eql([keyword("", "additionalProperties")]);
  });

  test("a document is found once for each tree and session", async () => {
    const { document, file } = await lower(JSON.stringify({ $schema: draft2020 }));
    expect(await documentForLint(document.tree, file)).to.equal(document);
  });
});

describe("appliesTo", () => {
  /** @type (schema: Record<string, Json>) => Promise<Record<string, string[]>> */
  const typesOf = async (schema) => {
    const { document, at } = await lower(JSON.stringify({ $schema: draft2020, ...schema }));
    return Object.fromEntries(at("").map(({ keywordNode, group }) => {
      return [keywordNode.children[0].value, [...appliesTo(document, group.expression)].sort()];
    }));
  };

  test("the type an operation is about", async () => {
    expect(await typesOf({ maximum: 1, pattern: "a", maxItems: 1, properties: { a: true } })).to.eql({
      maximum: ["number"],
      pattern: ["string"],
      maxItems: ["array"],
      properties: ["object"]
    });
  });

  test("a keyword that applies to every type", async () => {
    expect(await typesOf({ enum: [1], allOf: [true], title: "a" })).to.eql({
      enum: ["array", "boolean", "null", "number", "object", "string"],
      allOf: ["array", "boolean", "null", "number", "object", "string"],
      title: ["array", "boolean", "null", "number", "object", "string"]
    });
  });

  test("a keyword with no effect applies to nothing", async () => {
    expect(await typesOf({ uniqueItems: false, properties: {}, required: [] })).to.eql({ uniqueItems: [], properties: [], required: [] });
  });

  test("a case applies only where its condition can pass", async () => {
    // The condition is a type guard and `hasProperty`, and a schema it
    // applies could be about any type
    expect(await typesOf({ dependentRequired: { a: ["b"] }, dependentSchemas: { a: true } })).to.eql({
      dependentRequired: ["object"],
      dependentSchemas: ["object"]
    });
  });

  test("a format applies to the types it's defined for", async () => {
    expect(await typesOf({ format: "email" })).to.eql({ format: ["string"] });
    expect(await typesOf({ format: "nope" })).to.eql({ format: ["array", "boolean", "null", "number", "object", "string"] });
  });
});

describe("keywordAppliesTo", () => {
  test("a sibling applies to what the keywords that read it apply to", async () => {
    const { document, at, keyword } = await lower(JSON.stringify({ $schema: draft04, maximum: 5, exclusiveMaximum: true, minItems: 1 }));
    expect(keywordAppliesTo(document, at(""), keyword("", "exclusiveMaximum"))).to.eql(["number"]);
    expect(keywordAppliesTo(document, at(""), keyword("", "minItems"))).to.eql(["array"]);
  });

  test("a keyword with no group applies to nothing", async () => {
    const { document, at, keyword } = await lower(JSON.stringify({ $schema: draft04, exclusiveMaximum: true }));
    expect(keywordAppliesTo(document, at(""), keyword("", "exclusiveMaximum"))).to.eql([]);
  });
});

describe("assertsOnItsOwn", () => {
  /** @type (schema: Record<string, Json>) => Promise<Record<string, boolean>> */
  const assertions = async (schema) => {
    const { at } = await lower(JSON.stringify({ $schema: draft07, ...schema }));
    return Object.fromEntries(at("").map(({ keywordNode, group }) => [keywordNode.children[0].value, assertsOnItsOwn(group.expression)]));
  };

  test("keywords that can fail without a schema", async () => {
    expect(await assertions({ maximum: 1, pattern: "a", required: ["a"], dependencies: { a: ["b"] } })).to.eql({
      maximum: true,
      pattern: true,
      required: true,
      dependencies: true
    });
  });

  test("keywords that apply a schema, or only check the type or value", async () => {
    expect(await assertions({ contains: { const: 1 }, dependencies: { a: { required: ["b"] } }, type: "string", const: "a" })).to.eql({
      contains: false,
      dependencies: false,
      type: false,
      const: false
    });
  });
});

/**
 * @type (json: string) => Promise<{
 *   document: LintDocument;
 *   file: VFile;
 *   at: (pointer: string) => LoweredKeyword[];
 *   keyword: (pointer: string, name: string) => JsonSchemaKeywordNode;
 * }>
 */
const lower = async (json) => {
  const jsonSchema = new JsonSchema({ dialects: [draft04Dialect, draft07Dialect, draft201909Dialect, draft202012Dialect] });
  const session = jsonSchema.session();

  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session });
  const tree = /** @type JsonSchemaDocumentNode */ (/** @type unknown */ (await processor.run(processor.parse(file), file)));
  const root = /** @type JsonSchemaNode */ (tree.children[0]);
  const document = /** @type LintDocument */ (await documentForLint(tree, file));
  const schemas = document.schemas;

  /** @type (pointer: string) => JsonSchemaNode */
  const schemaAt = (pointer) => /** @type JsonSchemaNode */ (pointerGet(pointer, root));
  return {
    document,
    file,
    at: (pointer) => schemas.get(schemaAt(pointer)) ?? [],
    keyword: (pointer, name) => {
      const schemaNode = /** @type JsonSchemaNode & { children: JsonSchemaKeywordNode[] } */ (schemaAt(pointer));
      return /** @type JsonSchemaKeywordNode */ (schemaNode.children.find((keywordNode) => keywordNode.children[0].value === name));
    }
  };
};

/** @type (keywords: LoweredKeyword[]) => [string, Json][] */
const expressions = (keywords) => keywords.map(({ keywordNode, group }) => [keywordNode.children[0].value, /** @type Json */ (group.expression)]);
