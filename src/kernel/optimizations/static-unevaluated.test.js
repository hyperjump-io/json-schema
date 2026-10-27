import { describe, test, expect } from "vitest";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { addV1, v1DialectUri } from "../../dialects/v1/index.js";
import { addDraft201909, draft201909DialectUri } from "../../dialects/draft-2019-09/index.js";
import staticUnevaluated from "./static-unevaluated.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Expression, Kernel } from "../kernel.d.ts"
 */

const jsonSchema = new JsonSchema();
addV1(jsonSchema);

const draft201909JsonSchema = new JsonSchema();
addDraft201909(draft201909JsonSchema);

const mode = { fast: true, plugins: false, annotations: false };

let count = 0;

describe("staticUnevaluated", () => {
  describe("unevaluatedProperties", () => {
    test("selects what its siblings' properties and patterns don't", async () => {
      const groups = await optimizedGroups({
        properties: { foo: true },
        patternProperties: { "^x-": true },
        allOf: [{ properties: { bar: true } }],
        $ref: "#/$defs/baz",
        $defs: { baz: { properties: { baz: true } } },
        unevaluatedProperties: false
      });
      expect(groups.at(-1)).to.eql(["unevaluatedProperties", { op: "eachProperty", select: { except: { names: ["foo", "bar", "baz"], patterns: ["^x-"] } } }]);
    });

    test("is pass if a sibling marks every property", async () => {
      const groups = await optimizedGroups({
        allOf: [{ additionalProperties: true }],
        unevaluatedProperties: false
      });
      expect(groups.at(-1)).to.eql(["unevaluatedProperties", "pass"]);
    });

    test("is pass if a sibling has unevaluatedProperties", async () => {
      const groups = await optimizedGroups({
        allOf: [{ unevaluatedProperties: true }],
        unevaluatedProperties: false
      });
      expect(groups.at(-1)).to.eql(["unevaluatedProperties", "pass"]);
    });

    test("ignores what applies to properties' values and names", async () => {
      const groups = await optimizedGroups({
        properties: { foo: { properties: { bar: true } } },
        propertyNames: { properties: { baz: true } },
        unevaluatedProperties: false
      });
      expect(groups.at(-1)).to.eql(["unevaluatedProperties", { op: "eachProperty", select: { except: { names: ["foo"], patterns: [] } } }]);
    });

    test("ignores not, whose marks are never kept", async () => {
      const groups = await optimizedGroups({
        not: { properties: { foo: true } },
        unevaluatedProperties: false
      });
      expect(groups.at(-1)).to.eql(["unevaluatedProperties", { op: "eachProperty", select: { except: { names: [], patterns: [] } } }]);
    });

    test("is replaced next to a condition whose schemas don't mark properties", async () => {
      const groups = await optimizedGroups({
        anyOf: [{ required: ["foo"] }, { type: "object" }],
        unevaluatedProperties: false
      });
      expect(groups.at(-1)).to.eql(["unevaluatedProperties", { op: "eachProperty", select: { except: { names: [], patterns: [] } } }]);
    });

    test("is kept next to a condition whose schemas mark properties", async () => {
      const groups = await optimizedGroups({
        anyOf: [{ properties: { foo: true } }, true],
        unevaluatedProperties: false
      });
      expect(groups.at(-1)).to.eql(["unevaluatedProperties", { op: "eachProperty", select: { unevaluated: true } }]);
    });

    test("is kept next to if, whose condition's marks are kept if it passes", async () => {
      const groups = await optimizedGroups({
        if: { properties: { foo: true } },
        unevaluatedProperties: false
      });
      expect(groups.at(-1)).to.eql(["unevaluatedProperties", { op: "eachProperty", select: { unevaluated: true } }]);
    });

    test("is kept next to a schema that applies itself to the same instance", async () => {
      const groups = await optimizedGroups({
        $defs: { loop: { allOf: [{ $ref: "#/$defs/loop" }] } },
        $ref: "#/$defs/loop",
        unevaluatedProperties: false
      });
      expect(groups.at(-1)).to.eql(["unevaluatedProperties", { op: "eachProperty", select: { unevaluated: true } }]);
    });
  });

  describe("unevaluatedItems", () => {
    test("starts after its siblings' prefix", async () => {
      const groups = await optimizedGroups({
        prefixItems: [true],
        allOf: [{ prefixItems: [true, true] }],
        unevaluatedItems: false
      });
      expect(groups.at(-1)).to.eql(["unevaluatedItems", { op: "eachItem", from: 2 }]);
    });

    test("is pass if a sibling marks every item", async () => {
      const groups = await optimizedGroups({
        prefixItems: [true],
        items: true,
        unevaluatedItems: false
      });
      expect(groups.at(-1)).to.eql(["unevaluatedItems", "pass"]);
    });

    test("is kept next to contains, which marks items that depend on the instance", async () => {
      const groups = await optimizedGroups({
        contains: { type: "string" },
        unevaluatedItems: false
      });
      expect(groups.at(-1)).to.eql(["unevaluatedItems", { op: "eachItem", unevaluated: true }]);
    });

    test("starts after 2019-09's items array", async () => {
      const groups = await optimizedGroups({
        items: [true],
        unevaluatedItems: false
      }, { jsonSchema: draft201909JsonSchema, dialectUri: draft201909DialectUri });
      expect(groups.at(-1)).to.eql(["unevaluatedItems", { op: "eachItem", from: 1 }]);
    });

    test("is pass next to itemPattern, which marks every item if it passes", async () => {
      const groups = await optimizedGroups({
        itemPattern: [{ type: "string" }, "*"],
        unevaluatedItems: false
      });
      expect(groups.at(-1)).to.eql(["unevaluatedItems", "pass"]);
    });
  });

  test("doesn't change schemas without unevaluated selectors", async () => {
    const kernel = await compile({ properties: { foo: true } });
    expect(staticUnevaluated.optimize(kernel, mode).size).to.equal(0);
  });

  test("doesn't change anything for plugins, which see marks of schemas that fail", async () => {
    const kernel = await compile({ properties: { foo: true }, unevaluatedProperties: false });
    expect(staticUnevaluated.optimize(kernel, { fast: false, plugins: true, annotations: false }).size).to.equal(0);
    expect(staticUnevaluated.optimize(kernel, { fast: false, plugins: true, annotations: true }).size).to.equal(0);
  });

  test("changes schemas when annotating without plugins, which only keeps annotations of schemas that pass", async () => {
    const kernel = await compile({ properties: { foo: true }, unevaluatedProperties: false });
    expect(staticUnevaluated.optimize(kernel, { fast: false, plugins: false, annotations: true }).size).to.equal(1);
  });
});

/** @type (schema: Record<string, Json>, dialect?: { jsonSchema: JsonSchema; dialectUri: string }) => Promise<Kernel> */
const compile = async (schema, dialect = { jsonSchema, dialectUri: v1DialectUri }) => {
  const uri = `https://example.com/schema-${count++}`;
  const registry = new SchemaRegistry([{ schema, retrievalUri: uri, dialectUri: dialect.dialectUri }]);
  const validator = await dialect.jsonSchema.compile(uri, { registries: [registry] });
  return /** @type Kernel */ (validator.serialize());
};

/**
 * The root schema's keyword groups after the pass, by the last segment of
 * their keyword URIs, with what the groups that read marks became. What
 * they apply is left out, because it doesn't change.
 *
 * @type (schema: Record<string, Json>, dialect?: { jsonSchema: JsonSchema; dialectUri: string }) => Promise<[string, Json][]>
 */
const optimizedGroups = async (schema, dialect) => {
  const kernel = await compile(schema, dialect);
  const root = staticUnevaluated.optimize(kernel, mode).get(kernel.uri) ?? kernel.schemas[kernel.uri];
  if (typeof root === "boolean") {
    throw Error("Expected an object schema");
  }

  return root.keywords.map(({ keywordUri, expression }) => {
    const name = keywordUri.replace(/.*\/keyword\//, "");
    return [name, withoutOf(expression)];
  });
};

/** @type (expression: Expression) => Json */
const withoutOf = (expression) => {
  if (expression.op === "eachProperty" || expression.op === "eachItem") {
    return Object.fromEntries(Object.entries(expression).filter(([key]) => key !== "of"));
  }
  return expression.op;
};
