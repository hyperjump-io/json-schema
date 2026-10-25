import { describe, test, expect } from "vitest";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { addV1, v1DialectUri } from "../../dialects/v1/index.js";
import typeDispatch from "./type-dispatch.js";

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
  const kernel = typeDispatch.optimize(/** @type Kernel */ ((await compile(schema)).serialize()), mode);
  const root = kernel.schemas[kernel.uri];
  if (typeof root === "boolean") {
    throw Error("Expected an object schema");
  }

  const group = root.keywords.find(({ keywordUri }) => keywordUri.endsWith(`/${keyword}`));
  return JSON.parse(JSON.stringify(group?.expression), (key, value) => key === "schema" ? value.replace(/.*#/, "") : value);
};

describe("typeDispatch", () => {
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

  test("doesn't change anything for plugins, which see every error", async () => {
    const schema = { oneOf: [{ type: "string" }, { type: "object" }], anyOf: [{ type: "string" }, { type: "null" }] };
    const kernel = /** @type Kernel */ ((await compile(schema)).serialize());
    expect(typeDispatch.optimize(kernel, { fast: false, plugins: true, annotations: false })).to.equal(kernel);
  });

  describe("evaluated", () => {
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
