import { describe, test, expect } from "vitest";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { v1Dialect, v1DialectUri } from "../../dialects/v1/index.js";
import combine from "./combine.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { CompiledSchema, Kernel } from "../kernel.d.ts"
 * @import { Mode } from "../optimize.js"
 */

const jsonSchema = new JsonSchema({ dialects: [v1Dialect] });

const fast = { fast: true, plugins: false, annotations: false };
const plugins = { fast: false, plugins: true, annotations: false };

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

  test("with plugins, an applied schema's groups are inlined, without the ones nothing sees", async () => {
    const kernel = await optimizedKernel({ type: "string", allOf: [{ description: "A", type: "string" }] }, plugins);
    const allOf = kernel.keywords.find(({ keywordUri }) => keywordUri.endsWith("/allOf"));
    expect(allOf?.expression).to.eql({
      op: "inline",
      schema: "/allOf/0",
      keywords: [
        { keywordUri: "https://json-schema.org/keyword/type", location: "/allOf/0/type", sources: [], expression: { op: "typeIs", types: ["string"] } }
      ]
    });
    expect(kernel.keywords.map(({ keywordUri }) => keywordUri.replace(/.*\//, ""))).to.eql(["type", "allOf"]);
  });

  test("with annotations, annotating groups are kept", async () => {
    const kernel = await optimizedKernel({ allOf: [{ description: "A" }] }, { fast: false, plugins: true, annotations: true });
    const allOf = kernel.keywords.find(({ keywordUri }) => keywordUri.endsWith("/allOf"));
    expect(allOf?.expression).to.include({ op: "inline" });
  });

  test("with plugins, a false schema isn't inlined", async () => {
    const kernel = await optimizedKernel({ allOf: [false, { type: "string" }] }, plugins);
    const allOf = kernel.keywords.find(({ keywordUri }) => keywordUri.endsWith("/allOf"));
    expect(allOf?.expression).to.include({ op: "all" });
    expect(/** @type {{ of: { op: string }[] }} */ (allOf?.expression).of.map(({ op }) => op)).to.eql(["apply", "inline"]);
  });

  test("with plugins, inlined groups have their hooks in the group that applied them", async () => {
    const validator = await compile({ type: "number", allOf: [{ type: "string" }] });
    /** @type string[] */
    const calls = [];
    /** @type (location: string) => string */
    const at = (location) => location.replace(/.*#/, "");
    /** @type import("../evaluation-plugin.d.ts").EvaluationPlugin */
    const recorder = {
      beforeSchema: (schema) => { calls.push(`beforeSchema ${at(schema.absoluteKeywordLocation)}`); },
      afterSchema: (schema, _at, valid) => { calls.push(`afterSchema ${at(schema.absoluteKeywordLocation)} ${valid}`); },
      beforeKeyword: (keyword) => { calls.push(`beforeKeyword ${at(keyword.absoluteKeywordLocation)}`); },
      afterKeyword: (keyword, _at, valid) => { calls.push(`afterKeyword ${at(keyword.absoluteKeywordLocation)} ${valid}`); }
    };
    validator.validate(1, { plugins: [recorder] });
    expect(calls).to.eql([
      "beforeSchema ",
      "beforeKeyword /type",
      "afterKeyword /type true",
      "beforeKeyword /allOf",
      "beforeKeyword /allOf/0/type",
      "afterKeyword /allOf/0/type false",
      "afterKeyword /allOf false",
      "afterSchema  false"
    ]);
  });

  test("with plugins, each inlined group has its own errors", async () => {
    const validator = await compile({ type: "number", allOf: [{ type: "string" }, { minLength: 2 }] });
    const result = validator.validate("a", { output: "BASIC" });
    expect(result.errors.map((error) => /** @type {{ absoluteKeywordLocation: string }} */ (error).absoluteKeywordLocation.replace(/.*#/, ""))).to.eql([
      "/type",
      "/allOf/1/minLength"
    ]);
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
  return jsonSchema.compile(uri, { registry });
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

/**
 * The root schema after the pass, with each handle and location as its JSON
 * pointer
 *
 * @type (schema: Record<string, Json>, mode: Mode) => Promise<Exclude<CompiledSchema, boolean>>
 */
const optimizedKernel = async (schema, mode) => {
  const kernel = /** @type Kernel */ ((await compile(schema)).serialize());
  const root = combine.optimize(kernel, mode).get(kernel.uri);
  if (typeof root !== "object" || root === null) {
    throw Error("Expected the root schema to be replaced");
  }

  return JSON.parse(JSON.stringify(root), (key, value) => key === "schema" || key === "location" ? value.replace(/.*#/, "") : value);
};
