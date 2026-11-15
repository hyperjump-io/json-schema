import { Hyperjump } from "@hyperjump/browser";
import { describe, test, expect } from "vitest";
import { jsonSchemaConfig, extendDialect } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { lower } from "./lower.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Keyword, Reference } from "../keyword.d.ts"
 */

/** @type Reference[] */
const references = [];

// Records the references it's lowered with
/** @type Keyword<Reference, "reference"> */
const recordedKeyword = {
  uri: "https://example.com/keyword/recorded",
  shape: "reference",
  lower: (reference) => {
    references.push(reference);
    return reference.schema;
  }
};

const jsonSchema = jsonSchemaConfig({
  dialects: [extendDialect(v1Dialect, { keywords: { recorded: recordedKeyword } })],
  allowRetrieval: []
});

/** @type (schemas: Record<string, Json>[]) => SchemaRegistry */
const registryOf = (schemas) => new SchemaRegistry(schemas.map((schema) => ({ schema: { $schema: v1DialectUri, ...schema } })));

describe("lower", () => {
  test("a keyword is only lowered once what its references find is retrieved", async () => {
    references.length = 0;
    const registry = registryOf([
      { $id: "https://example.com/main", recorded: "https://example.com/other#/$defs/a" },
      { $id: "https://example.com/other", $defs: { a: { type: "string" } } }
    ]);
    await lower(new Hyperjump({ ...jsonSchema, registry }), "https://example.com/main");

    expect(references.map(({ handle }) => handle)).to.eql(["https://example.com/other#/$defs/a"]);
    expect(references[0].dynamicAnchors).to.eql({});
  });

  test("schemas in other documents are lowered, and the documents they reference", async () => {
    const registry = registryOf([
      { $id: "https://example.com/main", $ref: "https://example.com/a" },
      { $id: "https://example.com/a", $ref: "https://example.com/b" },
      { $id: "https://example.com/b", type: "string" }
    ]);
    const kernel = await lower(new Hyperjump({ ...jsonSchema, registry }), "https://example.com/main");

    expect(Object.keys(kernel.schemas).sort()).to.eql(["https://example.com/a#", "https://example.com/b#", "https://example.com/main#"]);
  });

  test("when references can't be retrieved, it's the first one's error", async () => {
    const registry = registryOf([
      { $id: "https://example.com/main", allOf: [{ $ref: "https://example.com/missing-a" }, { $ref: "https://example.com/missing-b" }] }
    ]);
    for (let attempt = 0; attempt < 3; attempt++) {
      await expect(lower(new Hyperjump({ ...jsonSchema, registry }), "https://example.com/main")).rejects.toThrow("missing-a");
    }
  });
});
