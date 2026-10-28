import { describe, test, beforeEach, expect } from "vitest";
import { RetrievalError } from "@hyperjump/browser";
import { JsonSchema, RetrievalNotAllowedError } from "../json-schema.js";
import { SchemaRegistry } from "./schema-registry.js";
import { addV1, v1DialectUri } from "../dialects/v1/index.js";
import vocabularyKeyword, { addVocabulary } from "../keywords/vocabulary.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 * @import { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts"
 */

describe("SchemaRegistry", () => {
  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = offline();
  });

  /** @type (registry: SchemaRegistry, uri: string) => ReturnType<JsonSchema["compile"]> */
  const compile = (registry, uri) => jsonSchema.compile(uri, { registries: [registry] });

  /** @type (...schemas: (Json | string)[]) => SchemaRegistry */
  const registryOf = (...schemas) => new SchemaRegistry(schemas.map((schema) => ({ schema })));

  describe("identification", () => {
    test("a schema is identified by its $id", async () => {
      const registry = registryOf(v1({ $id: "https://example.com/a", type: "string" }));

      const validator = await compile(registry, "https://example.com/a");
      expect(validator.validate("foo")).to.equal(true);
      expect(validator.validate(42)).to.equal(false);
    });

    test("a schema without an $id is identified by its retrieval URI", async () => {
      const registry = new SchemaRegistry().with(v1({ type: "string" }), { retrievalUri: "https://example.com/a" });

      expect((await compile(registry, "https://example.com/a")).validate(42)).to.equal(false);
    });

    test("a relative $id is resolved against the retrieval URI", async () => {
      const registry = new SchemaRegistry().with(v1({ $id: "b", type: "string" }), { retrievalUri: "https://example.com/a" });

      expect((await compile(registry, "https://example.com/b")).validate(42)).to.equal(false);
    });

    test("a schema with an $id is also found by its retrieval URI", async () => {
      const registry = new SchemaRegistry().with(v1({ $id: "https://example.com/b", type: "string" }), { retrievalUri: "https://example.com/a" });

      const node = await jsonSchema.session({ registries: [registry] }).get("https://example.com/a");
      expect(node.location).to.equal("https://example.com/b#");
      expect((await compile(registry, "https://example.com/a")).validate(42)).to.equal(false);
    });

    test("a retrieval URI that's another schema's $id is an error when it's looked up", async () => {
      const registry = registryOf(v1({ $id: "https://example.com/a" }))
        .with(v1({ $id: "https://example.com/b" }), { retrievalUri: "https://example.com/a" });

      await expect(compile(registry, "https://example.com/a")).rejects.toMatchObject({
        cause: { message: expect.stringContaining("More than one schema") }
      });
      await expect(compile(registry, "https://example.com/b")).resolves.toBeDefined();
    });

    test("JSON text", async () => {
      const registry = registryOf(`{ "$schema": "${v1DialectUri}", "$id": "https://example.com/a", "type": "string" }`);

      expect((await compile(registry, "https://example.com/a")).validate(42)).to.equal(false);
    });

    test("the dialect option is for a schema without $schema", async () => {
      const registry = new SchemaRegistry().with({ $id: "https://example.com/a", type: "string" }, { dialectUri: v1DialectUri });

      expect((await compile(registry, "https://example.com/a")).validate(42)).to.equal(false);
    });

    test("a schema without an $id or a retrieval URI is reported when a lookup fails", async () => {
      const registry = registryOf(v1({ type: "string" }));

      await expect(compile(registry, "https://example.com/a")).rejects.toMatchObject({
        cause: { errors: expect.arrayContaining([expect.objectContaining({ errors: [expect.objectContaining({ message: expect.stringContaining("needs an '$id' or a retrieval URI") })] })]) }
      });
    });

    // A schema in a file is retrieved from the file
    test("a schema can't be identified as a file", async () => {
      const registry = registryOf(v1({ $id: "file:///a.schema.json" }));

      await expect(compile(registry, "file:///a.schema.json")).rejects.toThrow(RetrievalError);
    });

    test("a schema can't have a file retrieval URI", () => {
      expect(() => new SchemaRegistry().with(v1({ type: "string" }), { retrievalUri: "file:///not/on/disk.schema.json" })).to.throw("can't have a 'file:' retrieval URI");
      expect(() => new SchemaRegistry([{ schema: v1({ type: "string" }), retrievalUri: "file:///not/on/disk.schema.json" }])).to.throw("can't have a 'file:' retrieval URI");
    });

    test("a schema that can't be identified throws when it's found by its retrieval URI", async () => {
      const registry = new SchemaRegistry().with(v1({ $id: "file:///a.schema.json" }), { retrievalUri: "https://example.com/a" });

      await expect(compile(registry, "https://example.com/a")).rejects.toMatchObject({
        messages: [{ ruleId: "file-uri-not-allowed", uri: "https://example.com/a" }]
      });
    });

    test("an embedded resource isn't identified", async () => {
      const registry = registryOf(v1({ $id: "https://example.com/a", $defs: { b: { $id: "https://example.com/b" } } }));

      await expect(compile(registry, "https://example.com/b")).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("references between schemas in registries", async () => {
      const registry = registryOf(
        v1({ $id: "https://example.com/a", $ref: "b" }),
        v1({ $id: "https://example.com/b", type: "string" })
      );

      expect((await compile(registry, "https://example.com/a")).validate(42)).to.equal(false);
    });
  });

  describe("adding and removing", () => {
    test("a retrieval URI can only be added once", () => {
      const registry = new SchemaRegistry().with(v1({}), { retrievalUri: "https://example.com/a" });

      expect(() => registry.with(v1({}), { retrievalUri: "https://example.com/a" })).to.throw("without");
      expect(() => new SchemaRegistry([
        { schema: v1({}), retrievalUri: "https://example.com/a" },
        { schema: v1({}), retrievalUri: "https://example.com/a" }
      ])).to.throw("More than one schema");
    });

    test("a registry never changes", async () => {
      const empty = new SchemaRegistry();
      const added = empty.with(v1({}), { retrievalUri: "https://example.com/a" });
      const removed = added.without("https://example.com/a");

      await expect(compile(empty, "https://example.com/a")).rejects.toThrow(RetrievalNotAllowedError);
      await expect(compile(added, "https://example.com/a")).resolves.toBeDefined();
      await expect(compile(removed, "https://example.com/a")).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("changing a schema after it's added doesn't change the registry", async () => {
      const schema = { $schema: v1DialectUri, type: "string" };
      const registry = new SchemaRegistry().with(schema, { retrievalUri: "https://example.com/a" });
      schema.type = "number";

      expect((await compile(registry, "https://example.com/a")).validate("foo")).to.equal(true);
    });

    test("a schema that isn't JSON is an error when it's added", () => {
      /** @type Record<string, any> */
      const schema = { $schema: v1DialectUri };
      schema.self = schema;

      expect(() => new SchemaRegistry().with(schema)).to.throw(TypeError);
    });

    test("an edit is without and then with", async () => {
      const registry = new SchemaRegistry()
        .with(v1({ type: "string" }), { retrievalUri: "https://example.com/a" })
        .without("https://example.com/a")
        .with(v1({ type: "number" }), { retrievalUri: "https://example.com/a" });

      expect((await compile(registry, "https://example.com/a")).validate(42)).to.equal(true);
    });

    test("removing a retrieval URI that isn't in the registry does nothing", () => {
      const registry = new SchemaRegistry();

      expect(registry.without("https://example.com/a")).to.equal(registry);
    });
  });

  describe("sessions", () => {
    test("a session sees the registries it was created with", async () => {
      const registry = new SchemaRegistry().with(v1({ type: "string" }), { retrievalUri: "https://example.com/a" });
      const before = jsonSchema.session({ registries: [registry] });

      const edited = registry.without("https://example.com/a")
        .with(v1({ type: "number" }), { retrievalUri: "https://example.com/a" })
        .with(v1({}), { retrievalUri: "https://example.com/b" });
      const after = jsonSchema.session({ registries: [edited] });

      expect((await before.compile("https://example.com/a")).validate(42)).to.equal(false);
      await expect(before.compile("https://example.com/b")).rejects.toThrow(RetrievalNotAllowedError);
      expect((await after.compile("https://example.com/a")).validate(42)).to.equal(true);
      await expect(after.compile("https://example.com/b")).resolves.toBeDefined();
    });

    test("a session registry is only seen by that session", async () => {
      const registry = registryOf(v1({ $id: "https://example.com/a", type: "string" }));

      expect((await compile(registry, "https://example.com/a")).validate(42)).to.equal(false);
      await expect(jsonSchema.compile("https://example.com/a")).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("a registry can be added to a JsonSchema", async () => {
      const registry = registryOf(v1({ $id: "https://example.com/a" }));
      jsonSchema.addRegistry(registry);

      await expect(jsonSchema.compile("https://example.com/a")).resolves.toBeDefined();
      expect(() => jsonSchema.addRegistry(registry)).to.throw("already been added");
    });

    test("a removed registry isn't seen by new sessions", async () => {
      const registry = registryOf(v1({ $id: "https://example.com/a" }));
      jsonSchema.addRegistry(registry);
      const before = jsonSchema.session();
      jsonSchema.removeRegistry(registry);

      await expect(before.compile("https://example.com/a")).resolves.toBeDefined();
      await expect(jsonSchema.compile("https://example.com/a")).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("a URI in more than one registry is an error", async () => {
      const registry = registryOf(v1({ $id: "https://example.com/a" }));
      const other = registryOf(v1({ $id: "https://example.com/a" }));

      await expect(jsonSchema.compile("https://example.com/a", { registries: [registry, other] })).rejects.toMatchObject({
        cause: { message: expect.stringContaining("More than one registry") }
      });
    });

    test("a schema is resolved once for every session", async () => {
      const registry = registryOf(v1({ $id: "https://example.com/a" }));

      const first = await jsonSchema.session({ registries: [registry] }).getDocument("https://example.com/a");
      const second = await jsonSchema.session({ registries: [registry] }).getDocument("https://example.com/a");

      expect(second).to.equal(first);
    });

    test("a schema is resolved once for every registry it's in", async () => {
      const registry = registryOf(v1({ $id: "https://example.com/a" }));
      const edited = registry.with(v1({}), { retrievalUri: "https://example.com/b" });

      const first = await jsonSchema.session({ registries: [registry] }).getDocument("https://example.com/a");
      const second = await jsonSchema.session({ registries: [edited] }).getDocument("https://example.com/a");

      expect(second).to.equal(first);
    });
  });

  describe("dialects", () => {
    const dialectUri = "https://example.com/dialect";

    test("a schema waits for its dialect to be defined", async () => {
      const registry = registryOf({ $schema: dialectUri, $id: "https://example.com/a" });
      await expect(compile(registry, "https://example.com/a")).rejects.toMatchObject({
        cause: { message: expect.stringContaining(dialectUri) }
      });

      jsonSchema.addDialect({ uri: dialectUri, keywords: { $id: "https://json-schema.org/keyword/id" }, unknownKeywords: "error" });

      await expect(compile(registry, "https://example.com/a")).resolves.toBeDefined();
    });

    test("each JsonSchema identifies a schema with its own dialects", async () => {
      const registry = registryOf({ $schema: dialectUri, $id: "https://example.com/a" });
      const other = offline();
      other.addDialect({ uri: dialectUri, keywords: { $id: "https://json-schema.org/keyword/id" }, unknownKeywords: "error" });

      await expect(other.compile("https://example.com/a", { registries: [registry] })).resolves.toBeDefined();
      await expect(compile(registry, "https://example.com/a")).rejects.toThrow(RetrievalError);
    });

    describe("from a meta-schema in the same registry", () => {
      const metaDialectUri = "https://example.com/meta-dialect";
      const coreVocabularyUri = "https://example.com/vocab/core";

      /** @type (vocabularies?: Record<string, boolean>) => Json */
      const metaSchema = (vocabularies = { [coreVocabularyUri]: true }) => ({
        $schema: metaDialectUri,
        $id: dialectUri,
        $vocabulary: vocabularies
      });

      /** @type Json */
      const schema = { $schema: dialectUri, $id: "https://example.com/a", type: "string" };

      /** @type (jsonSchema: JsonSchema) => JsonSchema */
      const addMetaDialect = (jsonSchema) => {
        addVocabulary(jsonSchema, coreVocabularyUri, { keywords: { $id: "https://json-schema.org/keyword/id", type: "https://json-schema.org/keyword/type" } });
        jsonSchema.addDialect({
          uri: metaDialectUri,
          keywords: { $id: "https://json-schema.org/keyword/id", $vocabulary: vocabularyKeyword.uri },
          unknownKeywords: "annotation"
        });
        return jsonSchema;
      };

      beforeEach(() => {
        addMetaDialect(jsonSchema);
      });

      test("a schema is identified with the dialect its meta-schema defines", async () => {
        const registry = registryOf(metaSchema(), schema);

        expect((await compile(registry, "https://example.com/a")).validate(42)).to.equal(false);
      });

      test("a schema added before its meta-schema", async () => {
        const before = registryOf(schema);
        const registry = before.with(metaSchema());

        expect((await compile(registry, "https://example.com/a")).validate(42)).to.equal(false);
        // The schema can't be identified without the meta-schema
        await expect(compile(before, "https://example.com/a")).rejects.toThrow(RetrievalError);
      });

      test("removing the meta-schema", async () => {
        const registry = new SchemaRegistry()
          .with(metaSchema(), { retrievalUri: dialectUri })
          .with(schema);

        await expect(compile(registry.without(dialectUri), "https://example.com/a")).rejects.toMatchObject({
          cause: { message: expect.stringContaining(dialectUri) }
        });
        expect((await compile(registry, "https://example.com/a")).validate(42)).to.equal(false);
      });

      test("replacing the meta-schema", async () => {
        const registry = new SchemaRegistry()
          .with(metaSchema(), { retrievalUri: dialectUri })
          .with(schema)
          .without(dialectUri)
          .with(metaSchema(), { retrievalUri: dialectUri });

        expect((await compile(registry, "https://example.com/a")).validate(42)).to.equal(false);
      });

      test("a meta-schema in another registry doesn't identify schemas", async () => {
        const other = registryOf(metaSchema());
        const registry = new SchemaRegistry().with(schema, { retrievalUri: "https://example.com/b" });
        const registries = [registry, other];

        await expect(jsonSchema.compile("https://example.com/a", { registries })).rejects.toThrow(RetrievalError);

        // It's found by its retrieval URI, and resolving it finds the meta-schema
        expect((await jsonSchema.compile("https://example.com/b", { registries })).validate(42)).to.equal(false);
      });

      test("a meta-schema that requires a vocabulary that isn't supported can't be found", async () => {
        const registry = new SchemaRegistry().with(metaSchema({ "https://example.com/vocab/unknown": true }), { retrievalUri: dialectUri });

        await expect(compile(registry, dialectUri)).rejects.toMatchObject({
          messages: [{ message: expect.stringContaining("https://example.com/vocab/unknown") }]
        });
      });
    });
  });

  describe("problems", () => {
    test("a schema with problems can't be retrieved", async () => {
      const registry = registryOf(v1({ $id: "https://example.com/a", type: 42 }));

      await expect(compile(registry, "https://example.com/a")).rejects.toMatchObject({
        messages: [{ ruleId: "https://json-schema.org/keyword/type", severity: "error", uri: "https://example.com/a" }]
      });
    });

    // So a tool can say which file a problem is in
    test("a problem has the schema's origin", async () => {
      const registry = new SchemaRegistry([{ schema: v1({ $id: "https://example.com/a", type: 42 }), origin: "schemas/a.schema.json" }]);

      await expect(compile(registry, "https://example.com/a")).rejects.toMatchObject({
        messages: [{ uri: "https://example.com/a", origin: "schemas/a.schema.json" }]
      });
    });

    test("the schema's document has its origin", async () => {
      const registry = new SchemaRegistry([{ schema: v1({ $id: "https://example.com/a" }), origin: "schemas/a.schema.json" }]);
      const session = offline().session({ registries: [registry] });
      const document = await session.getDocument("https://example.com/a");

      expect(/** @type JsonSchemaDocumentNode */ (/** @type unknown */ (document)).origin).to.equal("schemas/a.schema.json");
    });

    test("invalid JSON is an error when it's found by its retrieval URI", async () => {
      const registry = new SchemaRegistry().with("{", { retrievalUri: "https://example.com/a" });

      await expect(compile(registry, "https://example.com/a")).rejects.toMatchObject({
        messages: [
          { source: "json", message: "Object is missing its closing brace", uri: "https://example.com/a" },
          { source: "json-schema", ruleId: "missing-dialect" }
        ]
      });
    });
  });
});

/**
 * Nothing in these tests is retrieved, so a lookup that should find a
 * registry schema and doesn't is refused right away.
 *
 * @type (config?: JsonSchemaConfig) => JsonSchema
 */
const offline = (config) => {
  const jsonSchema = new JsonSchema({ allowRetrieval: [], ...config });
  addV1(jsonSchema);
  return jsonSchema;
};

/** @type (properties: Record<string, Json>) => Json */
const v1 = (properties) => ({ $schema: v1DialectUri, ...properties });
