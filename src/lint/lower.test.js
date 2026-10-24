import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { pointerGet, rejsonParse } from "@hyperjump/browser/json";
import { JsonSchema } from "../json-schema.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { addDraft04 } from "../dialects/draft-04/index.js";
import { addDraft07 } from "../dialects/draft-07/index.js";
import { addDraft201909 } from "../dialects/draft-2019-09/index.js";
import { addDraft202012 } from "../dialects/draft-2020-12/index.js";
import { appliesTo, assertsOnItsOwn, keywordAppliesTo } from "./analysis.js";
import { lowerForLint } from "./lower.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { LoweredKeyword } from "./lower.d.ts"
 */

const draft04 = "http://json-schema.org/draft-04/schema#";
const draft07 = "http://json-schema.org/draft-07/schema#";
const draft2019 = "https://json-schema.org/draft/2019-09/schema";
const draft2020 = "https://json-schema.org/draft/2020-12/schema";

/**
 * @type (json: string) => Promise<{
 *   session: JsonSchemaSession;
 *   tree: JsonSchemaDocumentNode;
 *   at: (pointer: string) => LoweredKeyword[];
 *   keyword: (pointer: string, name: string) => JsonSchemaKeywordNode;
 * }>
 */
const lower = async (json) => {
  const jsonSchema = new JsonSchema();
  addDraft04(jsonSchema);
  addDraft07(jsonSchema);
  addDraft201909(jsonSchema);
  addDraft202012(jsonSchema);
  const session = jsonSchema.session();

  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session });
  const tree = /** @type JsonSchemaDocumentNode */ (/** @type unknown */ (await processor.run(processor.parse(file), file)));
  const root = /** @type JsonSchemaNode */ (tree.children[0]);
  const schemas = await lowerForLint(session, tree);

  /** @type (pointer: string) => JsonSchemaNode */
  const schemaAt = (pointer) => /** @type JsonSchemaNode */ (pointerGet(pointer, root));
  return {
    session,
    tree,
    at: (pointer) => schemas.get(schemaAt(pointer)) ?? [],
    keyword: (pointer, name) => {
      const schemaNode = /** @type JsonSchemaNode & { children: JsonSchemaKeywordNode[] } */ (schemaAt(pointer));
      return /** @type JsonSchemaKeywordNode */ (schemaNode.children.find((keywordNode) => keywordNode.children[0].value === name));
    }
  };
};

/** @type (keywords: LoweredKeyword[]) => [string, Json][] */
const expressions = (keywords) => keywords.map(({ keywordNode, group }) => [keywordNode.children[0].value, /** @type Json */ (group.expression)]);

describe("lowerForLint", () => {
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
    expect(maximum.group.expression).to.eql({ op: "range", max: 5, exclusiveMax: false });
    expect(maximum.sourceNodes).to.eql([]);
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

  test("a document is lowered once for each session", async () => {
    const { session, tree } = await lower(JSON.stringify({ $schema: draft2020 }));
    expect(lowerForLint(session, tree)).to.equal(lowerForLint(session, tree));
  });
});

describe("appliesTo", () => {
  /** @type (schema: Record<string, Json>) => Promise<Record<string, string[]>> */
  const typesOf = async (schema) => {
    const { session, at } = await lower(JSON.stringify({ $schema: draft2020, ...schema }));
    return Object.fromEntries(at("").map(({ keywordNode, group }) => {
      return [keywordNode.children[0].value, [...appliesTo(session.jsonSchema, group.expression)].sort()];
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
    const { session, at, keyword } = await lower(JSON.stringify({ $schema: draft04, maximum: 5, exclusiveMaximum: true, minItems: 1 }));
    expect(keywordAppliesTo(session.jsonSchema, at(""), keyword("", "exclusiveMaximum"))).to.eql(["number"]);
    expect(keywordAppliesTo(session.jsonSchema, at(""), keyword("", "minItems"))).to.eql(["array"]);
  });

  test("a keyword with no group applies to nothing", async () => {
    const { session, at, keyword } = await lower(JSON.stringify({ $schema: draft04, exclusiveMaximum: true }));
    expect(keywordAppliesTo(session.jsonSchema, at(""), keyword("", "exclusiveMaximum"))).to.eql([]);
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
