import { describe, test, expect } from "vitest";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { addV1, v1DialectUri } from "../../dialects/v1/index.js";
import foldPassing from "./fold-passing.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Kernel } from "../kernel.d.ts"
 * @import { Mode } from "../optimize.js"
 */

const jsonSchema = new JsonSchema();
addV1(jsonSchema);

const fast = { fast: true, plugins: false, annotations: false };

let count = 0;

describe("fold-passing", () => {
  test("an item of an item pattern that always passes is pass", async () => {
    const expression = await optimized({ itemPattern: [true, { type: "string" }, "*"] }, "itemPattern");
    expect(expression).to.eql({
      op: "itemSequence",
      pattern: {
        sequence: [
          { item: { op: "pass" } },
          { repeat: { item: { op: "apply", schema: "/itemPattern/1" } }, min: 0, max: null }
        ]
      }
    });
  });

  test("an item pattern with a folded item means the same", async () => {
    const validator = await compile({ itemPattern: [{}, { type: "string" }, "*"] });
    /** @type Json[] */
    const instances = [[1], [1, "a", "b"], [1, 2], []];
    expect(instances.map((instance) => validator.validate(instance))).to.eql([true, true, false, false]);
  });
});

/** @type (schema: Record<string, Json>) => Promise<import("../../json-schema.d.ts").Validator> */
const compile = async (schema) => {
  const uri = `https://example.com/schema-${count++}`;
  const registry = new SchemaRegistry([{ schema, retrievalUri: uri, dialectUri: v1DialectUri }]);
  return jsonSchema.compile(uri, { registry });
};

/**
 * The expression of a keyword of the root schema after the pass, with each
 * schema it applies as the JSON pointer of the schema
 *
 * @type (schema: Record<string, Json>, keyword: string, mode?: Mode) => Promise<Json>
 */
const optimized = async (schema, keyword, mode = fast) => {
  const kernel = /** @type Kernel */ ((await compile(schema)).serialize());
  const root = foldPassing.optimize(kernel, mode).get(kernel.uri) ?? kernel.schemas[kernel.uri];
  if (typeof root === "boolean") {
    throw Error("Expected an object schema");
  }

  const group = root.keywords.find(({ keywordUri }) => keywordUri.endsWith(`/${keyword}`));
  return JSON.parse(JSON.stringify(group?.expression), (key, value) => key === "schema" ? value.replace(/.*#/, "") : value);
};
