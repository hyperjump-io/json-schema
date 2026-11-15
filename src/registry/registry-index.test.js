import { describe, test, expect } from "vitest";
import { jsonSchemaMediaTypes } from "../json-schema.js";
import { JsonSchemaHyperjump } from "../session.js";
import { SchemaRegistry } from "./schema-registry.js";
import { RegistryIndex } from "./registry-index.js";
import { toId } from "../identifiers.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { getDocument } from "../session.js";
import { definitionsOf } from "../definition-of.js";

/**
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 */

describe("RegistryIndex", () => {
  const uri = "https://example.com/a";

  test("an entry is found by the URI it's identified by", () => {
    const registry = new SchemaRegistry().with({ $schema: v1DialectUri }, { retrievalUri: uri });

    expect(new RegistryIndex(definitionsOf(v1()), registry).lookup(toId(uri))).to.include({ uri });
  });

  test("two entries found by the same URI are an error when it's looked up", () => {
    const registry = new SchemaRegistry()
      .with({ $schema: v1DialectUri, $id: uri })
      .with({ $schema: v1DialectUri, $id: uri }, { retrievalUri: "https://example.com/b" });
    const index = new RegistryIndex(definitionsOf(v1()), registry);

    expect(() => index.lookup(toId(uri))).to.throw("More than one schema");
    expect(index.lookup(toId("https://example.com/b"))).to.include({ uri });
  });

  test("a problem identifying an entry has its position", () => {
    const registry = new SchemaRegistry().with(`{
  "$schema": "${v1DialectUri}",
  "$id": "https://example.com/a#foo"
}`, { retrievalUri: uri });
    const index = new RegistryIndex(definitionsOf(v1()), registry);

    expect(index.lookup(toId(uri))?.error).toMatchObject({
      reason: expect.stringContaining("can't have a fragment"),
      place: { start: { line: 3, column: 10, offset: 54 }, end: { line: 3, column: 37, offset: 81 } }
    });
  });

  test("a problem identifying an entry added as a value has no position", () => {
    const registry = new SchemaRegistry().with({ $schema: v1DialectUri, $id: "https://example.com/a#foo" }, { retrievalUri: uri });
    const index = new RegistryIndex(definitionsOf(v1()), registry);
    const error = index.lookup(toId(uri))?.error;

    expect(error).toMatchObject({ reason: expect.stringContaining("can't have a fragment") });
    expect(/** @type {{ place?: unknown }} */ (error).place).to.equal(undefined);
  });

  test("an entry that isn't valid JSON can't be identified", () => {
    const registry = new SchemaRegistry().with(`{ "$schema": "${v1DialectUri}", }`, { retrievalUri: uri });
    const index = new RegistryIndex(definitionsOf(v1()), registry);

    expect(index.lookup(toId(uri))?.error?.message).to.contain("isn't valid JSON");
  });

  test("text and values are identified the same way", () => {
    const schema = { $schema: v1DialectUri, $id: "https://example.com/id" };
    const fromText = new RegistryIndex(definitionsOf(v1()), new SchemaRegistry().with(JSON.stringify(schema)));
    const fromValue = new RegistryIndex(definitionsOf(v1()), new SchemaRegistry().with(schema));

    expect(fromText.lookup(toId("https://example.com/id"))).to.include({ uri: "https://example.com/id" });
    expect(fromValue.lookup(toId("https://example.com/id"))).to.include({ uri: "https://example.com/id" });
  });

  test("a session doesn't identify entries until it looks for a schema", async () => {
    let identified = 0;
    const jsonSchema = {
      mediaTypes: jsonSchemaMediaTypes({ dialects: [{
        uri: "https://example.com/counted",
        keywords: {
          $id: {
            uri: "https://example.com/keyword/counted-id",
            shape: "data",
            resolve: (valueNode, context) => {
              identified++;
              context.setBaseUri(/** @type {{ value: string }} */ (valueNode).value);
            }
          }
        },
        unknownKeywords: "ignore"
      }] })
    };
    const registry = new SchemaRegistry().with({ $schema: "https://example.com/counted", $id: "https://example.com/counted-schema" });

    const session = new JsonSchemaHyperjump({ ...jsonSchema, registry });
    expect(identified).to.equal(0);

    await getDocument(session, "https://example.com/counted-schema");
    expect(identified).to.be.greaterThan(0);
  });
});

/** @type () => JsonSchemaConfig */
const v1 = () => {
  const jsonSchema = { mediaTypes: jsonSchemaMediaTypes({ dialects: [v1Dialect] }) };
  return jsonSchema;
};
