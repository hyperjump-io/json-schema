import { describe, test, beforeEach, expect } from "vitest";
import { RetrievalError } from "@hyperjump/browser";
import { JsonSchema } from "./json-schema.js";
import { SchemaRegistry } from "./schema-registry.js";
import { v1DialectUri } from "./v1/index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaConfig } from "./json-schema.d.ts"
 */

/**
 * Nothing in these tests is retrieved, so a lookup that should find a
 * registry schema and doesn't fails right away.
 *
 * @type (config?: JsonSchemaConfig) => JsonSchema
 */
const offline = (config) => {
  const jsonSchema = new JsonSchema(config);
  jsonSchema.removeUriSchemePlugin("http");
  jsonSchema.removeUriSchemePlugin("https");
  return jsonSchema;
};

/** @type (properties: Record<string, Json>) => Json */
const v1 = (properties) => ({ $schema: v1DialectUri, ...properties });

describe("SchemaRegistry", () => {
  /** @type JsonSchema */
  let jsonSchema;

  /** @type SchemaRegistry */
  let registry;

  beforeEach(() => {
    registry = new SchemaRegistry();
    jsonSchema = offline({ registries: [registry] });
  });

  describe("identification", () => {
    test("a schema is identified by its $id", async () => {
      registry.add(v1({ $id: "https://example.com/a", type: "string" }));

      const validator = await jsonSchema.compile("https://example.com/a");
      expect(validator.validate("foo")).to.equal(true);
      expect(validator.validate(42)).to.equal(false);
    });

    test("a schema without an $id is identified by its retrieval URI", async () => {
      registry.add(v1({ type: "string" }), { retrievalUri: "https://example.com/a" });

      expect((await jsonSchema.compile("https://example.com/a")).validate(42)).to.equal(false);
    });

    test("a relative $id is resolved against the retrieval URI", async () => {
      registry.add(v1({ $id: "b", type: "string" }), { retrievalUri: "https://example.com/a" });

      expect((await jsonSchema.compile("https://example.com/b")).validate(42)).to.equal(false);
    });

    test("a schema with an $id is also found by its retrieval URI", async () => {
      registry.add(v1({ $id: "https://example.com/b", type: "string" }), { retrievalUri: "https://example.com/a" });

      const node = await jsonSchema.session().get("https://example.com/a");
      expect(node.location).to.equal("https://example.com/b#");
      expect((await jsonSchema.compile("https://example.com/a")).validate(42)).to.equal(false);
    });

    test("a retrieval URI that's another schema's $id can't be added", () => {
      registry.add(v1({ $id: "https://example.com/a" }));

      expect(() => registry.add(v1({ $id: "https://example.com/b" }), { retrievalUri: "https://example.com/a" })).to.throw("already a schema");
    });

    test("a retrieval URI that's a keyword's URI can't be added", () => {
      expect(() => registry.add(v1({}), { retrievalUri: "https://json-schema.org/keyword/type" })).to.throw("keyword's schema");
    });

    test("JSON text", async () => {
      registry.add(`{ "$schema": "${v1DialectUri}", "$id": "https://example.com/a", "type": "string" }`);

      expect((await jsonSchema.compile("https://example.com/a")).validate(42)).to.equal(false);
    });

    test("the dialect option is for a schema without $schema", async () => {
      registry.add({ $id: "https://example.com/a", type: "string" }, { dialectUri: v1DialectUri });

      expect((await jsonSchema.compile("https://example.com/a")).validate(42)).to.equal(false);
    });

    test("a schema without an $id or a retrieval URI can't be added", () => {
      expect(() => registry.add(v1({ type: "string" }))).to.throw("needs an '$id' or a retrieval URI");
    });

    test("a relative $id without a retrieval URI can't be added", () => {
      expect(() => registry.add(v1({ $id: "a" }))).to.throw();
    });

    test("a schema can't be identified as a file without a file retrieval URI", () => {
      expect(() => registry.add(v1({ $id: "file:///a.schema.json" }))).to.throw("'file:'");
    });

    test("a schema with a file retrieval URI", async () => {
      registry.add(v1({ type: "string" }), { retrievalUri: "file:///not/on/disk.schema.json" });

      expect((await jsonSchema.compile("file:///not/on/disk.schema.json")).validate(42)).to.equal(false);
    });

    test("a keyword's schema can't be replaced", () => {
      expect(() => registry.add(v1({ $id: "https://json-schema.org/keyword/type" }))).to.throw("keyword's schema");
    });

    test("an embedded resource isn't identified", async () => {
      registry.add(v1({ $id: "https://example.com/a", $defs: { b: { $id: "https://example.com/b" } } }));

      await expect(jsonSchema.compile("https://example.com/b")).rejects.toThrow(RetrievalError);
    });

    test("references between schemas in registries", async () => {
      registry.add(v1({ $id: "https://example.com/a", $ref: "b" }));
      registry.add(v1({ $id: "https://example.com/b", type: "string" }));

      expect((await jsonSchema.compile("https://example.com/a")).validate(42)).to.equal(false);
    });
  });

  describe("adding and removing", () => {
    test("a retrieval URI can only be added once", () => {
      registry.add(v1({}), { retrievalUri: "https://example.com/a" });

      expect(() => registry.add(v1({}), { retrievalUri: "https://example.com/a" })).to.throw("remove");
    });

    test("a schema that's identified by a URI that's already in the registry isn't added", async () => {
      registry.add(v1({ $id: "https://example.com/a", type: "string" }));

      expect(() => registry.add(v1({ $id: "https://example.com/a", type: "number" }), { retrievalUri: "https://example.com/b" })).to.throw("already a schema");
      expect((await jsonSchema.compile("https://example.com/a")).validate("foo")).to.equal(true);

      // It wasn't added, so its retrieval URI is still available
      registry.add(v1({}), { retrievalUri: "https://example.com/b" });
    });

    test("an edit is a remove and an add", async () => {
      registry.add(v1({ type: "string" }), { retrievalUri: "https://example.com/a" });
      registry.remove("https://example.com/a");
      registry.add(v1({ type: "number" }), { retrievalUri: "https://example.com/a" });

      expect((await jsonSchema.compile("https://example.com/a")).validate(42)).to.equal(true);
    });

    test("removing a retrieval URI that isn't in the registry does nothing", () => {
      expect(() => registry.remove("https://example.com/a")).not.to.throw();
    });

    test("a removed schema isn't found", async () => {
      registry.add(v1({}), { retrievalUri: "https://example.com/a" });
      registry.remove("https://example.com/a");

      await expect(jsonSchema.compile("https://example.com/a")).rejects.toThrow(RetrievalError);
    });
  });

  describe("sessions", () => {
    test("a session sees a registry as it was when the session was created", async () => {
      registry.add(v1({ type: "string" }), { retrievalUri: "https://example.com/a" });
      const before = jsonSchema.session();

      registry.remove("https://example.com/a");
      registry.add(v1({ type: "number" }), { retrievalUri: "https://example.com/a" });
      registry.add(v1({}), { retrievalUri: "https://example.com/b" });
      const after = jsonSchema.session();

      expect((await before.compile("https://example.com/a")).validate(42)).to.equal(false);
      await expect(before.compile("https://example.com/b")).rejects.toThrow(RetrievalError);
      expect((await after.compile("https://example.com/a")).validate(42)).to.equal(true);
      await expect(after.compile("https://example.com/b")).resolves.toBeDefined();
    });

    test("a session registry is only seen by that session", async () => {
      const sessionRegistry = new SchemaRegistry();
      sessionRegistry.add(v1({ $id: "https://example.com/a", type: "string" }));

      expect((await jsonSchema.compile("https://example.com/a", { registries: [sessionRegistry] })).validate(42)).to.equal(false);
      await expect(jsonSchema.compile("https://example.com/a")).rejects.toThrow(RetrievalError);
    });

    test("a registry can be added to a JsonSchema", async () => {
      const added = new SchemaRegistry();
      added.add(v1({ $id: "https://example.com/a" }));
      jsonSchema.addRegistry(added);

      await expect(jsonSchema.compile("https://example.com/a")).resolves.toBeDefined();
      expect(() => jsonSchema.addRegistry(added)).to.throw("already been added");
    });

    test("a removed registry isn't seen by new sessions", async () => {
      registry.add(v1({ $id: "https://example.com/a" }));
      const before = jsonSchema.session();
      jsonSchema.removeRegistry(registry);

      await expect(before.compile("https://example.com/a")).resolves.toBeDefined();
      await expect(jsonSchema.compile("https://example.com/a")).rejects.toThrow(RetrievalError);
    });

    test("a URI in more than one registry is an error", async () => {
      const other = new SchemaRegistry();
      other.add(v1({ $id: "https://example.com/a" }));
      registry.add(v1({ $id: "https://example.com/a" }));

      await expect(jsonSchema.compile("https://example.com/a", { registries: [other] })).rejects.toMatchObject({
        cause: { message: expect.stringContaining("More than one registry") }
      });
    });

    test("a schema is resolved once for every session", async () => {
      registry.add(v1({ $id: "https://example.com/a" }));

      const first = await jsonSchema.session().getDocument("https://example.com/a");
      const second = await jsonSchema.session().getDocument("https://example.com/a");

      expect(second).to.equal(first);
    });
  });

  describe("dialects", () => {
    const dialectUri = "https://example.com/dialect";

    test("a schema waits for its dialect to be defined", async () => {
      registry.add({ $schema: dialectUri, $id: "https://example.com/a" });
      await expect(jsonSchema.compile("https://example.com/a")).rejects.toMatchObject({
        cause: { message: expect.stringContaining(dialectUri) }
      });

      jsonSchema.addDialect({ uri: dialectUri, keywords: { $id: "https://json-schema.org/keyword/id" }, unknownKeywords: "error" });

      await expect(jsonSchema.compile("https://example.com/a")).resolves.toBeDefined();
    });

    test("each JsonSchema identifies a schema with its own dialects", async () => {
      registry.add({ $schema: dialectUri, $id: "https://example.com/a" });
      const other = offline({ registries: [registry] });
      other.addDialect({ uri: dialectUri, keywords: { $id: "https://json-schema.org/keyword/id" }, unknownKeywords: "error" });

      await expect(other.compile("https://example.com/a")).resolves.toBeDefined();
      await expect(jsonSchema.compile("https://example.com/a")).rejects.toThrow(RetrievalError);
    });

    test("a JsonSchema that can't identify a schema keeps it from being added", () => {
      const other = offline({ registries: [registry] });
      other.addDialect({ uri: dialectUri, keywords: { $id: "https://json-schema.org/keyword/id" }, unknownKeywords: "error" });

      expect(() => registry.add({ $schema: dialectUri, $id: "a" })).to.throw();
    });
  });

  describe("problems", () => {
    test("a schema with problems can't be retrieved", async () => {
      registry.add(v1({ $id: "https://example.com/a", type: 42 }));

      await expect(jsonSchema.compile("https://example.com/a")).rejects.toMatchObject({
        cause: { ruleId: "https://json-schema.org/keyword/type" }
      });
    });

    test("invalid JSON can't be added", () => {
      expect(() => registry.add("{", { retrievalUri: "https://example.com/a" })).to.throw("isn't valid JSON");
    });
  });
});
