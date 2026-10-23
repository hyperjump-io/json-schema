import { describe, test, expect } from "vitest";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { addV1, v1DialectUri } from "../../dialects/v1/index.js";
import { addDraft201909, draft201909DialectUri } from "../../dialects/draft-2019-09/index.js";
import staticUnevaluated from "./static-unevaluated.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { CompiledSchemas } from "../compile.js"
 */

const jsonSchema = new JsonSchema();
addV1(jsonSchema);

const draft201909JsonSchema = new JsonSchema();
addDraft201909(draft201909JsonSchema);

let count = 0;

/**
 * The root schema's keywords after the pass, by the last segment of their
 * URIs. Handles are left out of compiled values, because they're only
 * checked by evaluating.
 *
 * @type (schema: Record<string, Json>, dialect?: { jsonSchema: JsonSchema; dialectUri: string }) => Promise<[string, Json][]>
 */
const optimizedKeywords = async (schema, dialect = { jsonSchema, dialectUri: v1DialectUri }) => {
  const uri = `https://example.com/schema-${count++}`;
  const registry = new SchemaRegistry([{ schema, retrievalUri: uri, dialectUri: dialect.dialectUri }]);
  const validator = await dialect.jsonSchema.compile(uri, { registries: [registry] });
  const compiled = staticUnevaluated.optimize(/** @type CompiledSchemas */ (validator.serialize()), dialect.jsonSchema);
  const root = compiled.schemas[compiled.uri];
  if (typeof root === "boolean") {
    throw Error("Expected an object schema");
  }

  return root.keywords.map(([keywordUri, , value]) => {
    const name = keywordUri.replace(/.*\/keyword\//, "");
    if (typeof value === "object" && value !== null && !Array.isArray(value) && "handle" in value) {
      return [name, Object.fromEntries(Object.entries(value).filter(([key]) => key !== "handle"))];
    }
    return [name, typeof value === "string" ? "<handle>" : value];
  });
};

describe("staticUnevaluated", () => {
  describe("unevaluatedProperties", () => {
    test("becomes additionalProperties with its siblings' properties and patterns", async () => {
      const keywords = await optimizedKeywords({
        properties: { foo: true },
        patternProperties: { "^x-": true },
        allOf: [{ properties: { bar: true } }],
        $ref: "#/$defs/baz",
        $defs: { baz: { properties: { baz: true } } },
        unevaluatedProperties: false
      });
      expect(keywords.at(-1)).to.eql(["additionalProperties", { properties: ["foo", "bar", "baz"], patterns: ["^x-"] }]);
    });

    test("is left out if a sibling evaluates every property", async () => {
      const keywords = await optimizedKeywords({
        allOf: [{ additionalProperties: true }],
        unevaluatedProperties: false
      });
      expect(keywords.map(([name]) => name)).to.not.include("unevaluatedProperties");
      expect(keywords.map(([name]) => name)).to.not.include("additionalProperties");
    });

    test("is left out if a sibling has unevaluatedProperties", async () => {
      const keywords = await optimizedKeywords({
        allOf: [{ unevaluatedProperties: true }],
        unevaluatedProperties: false
      });
      expect(keywords.map(([name]) => name)).to.eql(["allOf"]);
    });

    test("ignores keywords that apply to properties' values and names", async () => {
      const keywords = await optimizedKeywords({
        properties: { foo: { properties: { bar: true } } },
        propertyNames: { properties: { baz: true } },
        unevaluatedProperties: false
      });
      expect(keywords.at(-1)).to.eql(["additionalProperties", { properties: ["foo"], patterns: [] }]);
    });

    test("ignores not, whose subschema's marks are never kept", async () => {
      const keywords = await optimizedKeywords({
        not: { properties: { foo: true } },
        unevaluatedProperties: false
      });
      expect(keywords.at(-1)).to.eql(["additionalProperties", { properties: [], patterns: [] }]);
    });

    test("is replaced next to a conditional applicator whose subschemas don't evaluate properties", async () => {
      const keywords = await optimizedKeywords({
        anyOf: [{ required: ["foo"] }, { type: "object" }],
        unevaluatedProperties: false
      });
      expect(keywords.at(-1)).to.eql(["additionalProperties", { properties: [], patterns: [] }]);
    });

    test("is kept next to a conditional applicator whose subschemas evaluate properties", async () => {
      const keywords = await optimizedKeywords({
        anyOf: [{ properties: { foo: true } }, true],
        unevaluatedProperties: false
      });
      expect(keywords.at(-1)).to.eql(["unevaluatedProperties", "<handle>"]);
    });

    test("is kept next to if, whose subschema's marks are kept if it passes", async () => {
      const keywords = await optimizedKeywords({
        if: { properties: { foo: true } },
        unevaluatedProperties: false
      });
      expect(keywords.at(-1)).to.eql(["unevaluatedProperties", "<handle>"]);
    });

    test("is kept next to a schema that applies itself to the same instance", async () => {
      const keywords = await optimizedKeywords({
        $defs: { loop: { allOf: [{ $ref: "#/$defs/loop" }] } },
        $ref: "#/$defs/loop",
        unevaluatedProperties: false
      });
      expect(keywords.at(-1)).to.eql(["unevaluatedProperties", "<handle>"]);
    });
  });

  describe("unevaluatedItems", () => {
    test("becomes items after its siblings' prefix", async () => {
      const keywords = await optimizedKeywords({
        prefixItems: [true],
        allOf: [{ prefixItems: [true, true] }],
        unevaluatedItems: false
      });
      expect(keywords.at(-1)).to.eql(["items", { start: 2 }]);
    });

    test("is left out if a sibling evaluates every item", async () => {
      const keywords = await optimizedKeywords({
        prefixItems: [true],
        items: true,
        unevaluatedItems: false
      });
      expect(keywords.map(([name]) => name)).to.eql(["prefixItems", "items"]);
    });

    test("is kept next to contains, which evaluates items that depend on the instance", async () => {
      const keywords = await optimizedKeywords({
        contains: { type: "string" },
        unevaluatedItems: false
      });
      expect(keywords.at(-1)).to.eql(["unevaluatedItems", "<handle>"]);
    });

    test("becomes additionalItems in 2019-09, which doesn't have items with a start", async () => {
      const keywords = await optimizedKeywords({
        items: [true],
        unevaluatedItems: false
      }, { jsonSchema: draft201909JsonSchema, dialectUri: draft201909DialectUri });
      expect(keywords.at(-1)).to.eql(["draft-2019-09/additionalItems", { start: 1 }]);
    });
  });

  test("doesn't change schemas without unevaluatedProperties or unevaluatedItems", async () => {
    const uri = `https://example.com/schema-${count++}`;
    const registry = new SchemaRegistry([{ schema: { properties: { foo: true } }, retrievalUri: uri, dialectUri: v1DialectUri }]);
    const validator = await jsonSchema.compile(uri, { registries: [registry] });
    const compiled = /** @type CompiledSchemas */ (validator.serialize());
    expect(staticUnevaluated.optimize(compiled, jsonSchema)).to.equal(compiled);
  });
});
