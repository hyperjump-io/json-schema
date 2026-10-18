import { describe, test, expect } from "vitest";
import { JsonSchema } from "./json-schema.js";
import { SchemaRegistry } from "./schema-registry.js";
import { RegistryIndex } from "./registry-index.js";
import { v1DialectUri } from "./v1/index.js";

describe("RegistryIndex", () => {
  const uri = "https://example.com/a";

  test("a removed entry is kept while an open session can see it", () => {
    const registry = new SchemaRegistry();
    const index = new RegistryIndex(new JsonSchema(), registry);
    registry.add({ $schema: v1DialectUri }, { retrievalUri: uri });

    const version = index.open();
    registry.remove(uri);

    expect(index.lookup(uri, version)).to.include({ uri });

    index.close(version);
    expect(index.lookup(uri, version)).to.equal(undefined);
  });

  test("a removed entry is forgotten if no session can see it", () => {
    const registry = new SchemaRegistry();
    const index = new RegistryIndex(new JsonSchema(), registry);
    registry.add({ $schema: v1DialectUri }, { retrievalUri: uri });
    const version = index.open();
    index.close(version);

    registry.remove(uri);

    expect(index.lookup(uri, version)).to.equal(undefined);
  });

  test("an entry added after a session was opened isn't seen by it", () => {
    const registry = new SchemaRegistry();
    const index = new RegistryIndex(new JsonSchema(), registry);
    const version = index.open();

    registry.add({ $schema: v1DialectUri }, { retrievalUri: uri });

    expect(index.lookup(uri, version)).to.equal(undefined);
    expect(index.lookup(uri, index.open())).to.include({ uri });
  });

  test("entries already in the registry are indexed", () => {
    const registry = new SchemaRegistry();
    registry.add({ $schema: v1DialectUri }, { retrievalUri: uri });

    const index = new RegistryIndex(new JsonSchema(), registry);

    expect(index.lookup(uri, index.open())).to.include({ uri });
  });
});
