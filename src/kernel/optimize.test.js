import { describe, test, expect } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { optimize } from "./optimize.js";
import { compile as compileSchema, serialize } from "../operations/compile.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Kernel } from "./kernel.d.ts"
 */

const jsonSchema = new JsonSchema({ dialects: [v1Dialect] });

let count = 0;

describe("optimize", () => {
  test("keeps what the schemas read up to date with the schemas passes replace", async () => {
    const kernel = await compile({ properties: { foo: true }, unevaluatedProperties: false });
    expect(kernel.reads.evaluated).to.eql([kernel.uri]);

    // Without plugins, the selector doesn't read marks anymore
    expect(optimize(kernel, { fast: true, plugins: false, annotations: false }).reads.evaluated).to.eql([]);
    expect(optimize(kernel, { fast: false, plugins: true, annotations: false }).reads.evaluated).to.eql([kernel.uri]);
  });

  test("doesn't copy a kernel no pass changes", async () => {
    const kernel = await compile({ type: "string" });
    expect(optimize(kernel, { fast: false, plugins: true, annotations: false })).to.equal(kernel);
  });
});

/** @type (schema: Record<string, Json>) => Promise<Kernel> */
const compile = async (schema) => {
  const uri = `https://example.com/schema-${count++}`;
  const registry = new SchemaRegistry([{ schema, retrievalUri: uri, dialectUri: v1DialectUri }]);
  const compiled = await compileSchema(jsonSchema, uri, { registry });
  return /** @type Kernel */ (serialize(compiled));
};
