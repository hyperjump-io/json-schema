import { describe, test, expect } from "vitest";
import { JsonSchema } from "./json-schema.js";
import { SchemaRegistry } from "./schema-registry.js";
import { RegistryIndex } from "./registry-index.js";
import { v1DialectUri } from "./v1/index.js";

describe("RegistryIndex", () => {
  const uri = "https://example.com/a";

  test("an entry is found by the URI it's identified by", () => {
    const registry = new SchemaRegistry().with({ $schema: v1DialectUri }, { retrievalUri: uri });

    expect(new RegistryIndex(new JsonSchema(), registry).lookup(uri)).to.include({ uri });
  });

  test("two entries found by the same URI are an error when it's looked up", () => {
    const registry = new SchemaRegistry()
      .with({ $schema: v1DialectUri, $id: uri })
      .with({ $schema: v1DialectUri, $id: uri }, { retrievalUri: "https://example.com/b" });
    const index = new RegistryIndex(new JsonSchema(), registry);

    expect(() => index.lookup(uri)).to.throw("More than one schema");
    expect(index.lookup("https://example.com/b")).to.include({ uri });
  });
});
