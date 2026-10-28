import { describe, test, expect } from "vitest";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { addV1, v1DialectUri } from "../../dialects/v1/index.js";
import combine from "./combine.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Kernel } from "../kernel.d.ts"
 * @import { Mode } from "../optimize.js"
 */

const jsonSchema = new JsonSchema();
addV1(jsonSchema);

const fast = { fast: true, plugins: false, annotations: false };

let count = 0;

describe("combine", () => {
  test("applied schemas are inlined and their types intersected", async () => {
    const expression = await optimized({
      type: ["number", "string"],
      allOf: [{ type: "integer" }, { type: ["integer", "null"] }]
    });
    expect(expression).to.eql({ op: "typeIs", types: ["integer"] });
  });

  test("types with nothing in common fail", async () => {
    const validator = await compile({ type: "string", allOf: [{ type: "number" }] });
    expect(validator.validate("a")).to.equal(false);
    expect(validator.validate(1)).to.equal(false);
  });

  test("ranges are the tightest limits, exclusive if an equal one is", async () => {
    const expression = await optimized({
      minimum: 1,
      maximum: 10,
      allOf: [{ exclusiveMinimum: 1 }, { maximum: 5 }, { minimum: 0 }]
    });
    expect(expression).to.eql({ op: "range", min: 1, exclusiveMin: true, max: 5 });
  });

  test("counts are the tightest limits", async () => {
    const expression = await optimized({ minLength: 1, allOf: [{ minLength: 3, maxLength: 5 }, { maxLength: 8 }] });
    expect(expression).to.eql({ op: "stringLength", min: 3, max: 5 });
  });

  test("identical operations are one", async () => {
    const expression = await optimized({ pattern: "^a", allOf: [{ pattern: "^a" }, { pattern: "b$" }] });
    expect(expression).to.eql({ op: "all", of: [{ op: "matches", pattern: "^a" }, { op: "matches", pattern: "b$" }] });
  });

  test("annotations are left out", async () => {
    const expression = await optimized({ title: "A", allOf: [{ description: "B", type: "string" }] });
    expect(expression).to.eql({ op: "typeIs", types: ["string"] });
  });

  test("a schema that applies itself keeps the apply", async () => {
    const expression = await optimized({ type: "object", allOf: [{ $ref: "#" }] });
    expect(expression).to.eql({ op: "all", of: [{ op: "typeIs", types: ["object"] }, { op: "apply", schema: "" }] });
  });

  test("a schema that reads marks isn't inlined", async () => {
    const expression = await optimized({ allOf: [{ type: "object", unevaluatedProperties: false }] });
    expect(expression).to.eql(undefined);
  });

  test("nothing changes with plugins", async () => {
    const expression = await optimized({ type: "string", allOf: [{ type: "string" }] }, { fast: false, plugins: true, annotations: false });
    expect(expression).to.eql(undefined);
  });

  test("a combined schema means the same", async () => {
    const validator = await compile({
      type: "number",
      minimum: 3,
      allOf: [{ type: "integer", minimum: 5 }, { type: ["number", "string"], maximum: 10 }]
    });
    /** @type Json[] */
    const instances = [4, 5, 5.5, 10, 11, "a"];
    expect(instances.map((instance) => validator.validate(instance))).to.eql([false, true, false, true, false, false]);
  });
});

/** @type (schema: Record<string, Json>) => Promise<import("../../json-schema.d.ts").Validator> */
const compile = async (schema) => {
  const uri = `https://example.com/schema-${count++}`;
  const registry = new SchemaRegistry([{ schema, retrievalUri: uri, dialectUri: v1DialectUri }]);
  return jsonSchema.compile(uri, { registries: [registry] });
};

/**
 * The root schema's expression after the pass, with each schema it applies
 * as the JSON pointer of the schema, or undefined if the pass doesn't
 * replace it
 *
 * @type (schema: Record<string, Json>, mode?: Mode) => Promise<Json | undefined>
 */
const optimized = async (schema, mode = fast) => {
  const kernel = /** @type Kernel */ ((await compile(schema)).serialize());
  const root = combine.optimize(kernel, mode).get(kernel.uri);
  if (root === undefined) {
    return undefined;
  }
  if (typeof root === "boolean" || root === null) {
    throw Error("Expected an object schema");
  }

  return JSON.parse(JSON.stringify(root.keywords[0].expression), (key, value) => key === "schema" ? value.replace(/.*#/, "") : value);
};
