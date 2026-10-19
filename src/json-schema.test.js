import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeEach, expect } from "vitest";
import { Session } from "@hyperjump/browser";
import { JsonSchema } from "./json-schema.js";
import { v1DialectUri } from "./dialects/v1/index.js";
import { SchemaRegistry } from "./registry/schema-registry.js";
import unknownKeyword from "./keywords/unknown.js";
import vocabularyKeyword, { addVocabulary } from "./keywords/vocabulary.js";

/** A keyword schema that allows any value, for keywords defined in tests */
const anyValue = unknownKeyword.schema;

/**
 * @import { Dialect } from "./dialect.d.ts"
 * @import { Keyword } from "./keyword.d.ts"
 */

describe("JsonSchema", () => {
  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = new JsonSchema();
  });

  describe("dialects", () => {
    /** @type Dialect */
    const dialect = {
      uri: "https://example.com/dialect",
      keywords: { $id: "https://json-schema.org/keyword/id" },
      unknownKeywords: "error"
    };

    test("addDialect", () => {
      jsonSchema.addDialect(dialect);

      expect(jsonSchema.hasDialect(dialect.uri)).to.equal(true);
      expect(jsonSchema.getDialect(dialect.uri)).to.eql(dialect);
    });

    test("an empty fragment identifies the same dialect", () => {
      jsonSchema.addDialect({ ...dialect, uri: `${dialect.uri}#` });

      expect(jsonSchema.hasDialect(dialect.uri)).to.equal(true);
      expect(jsonSchema.getDialect(dialect.uri)).to.eql(dialect);
    });

    test("a dialect can't be replaced", () => {
      jsonSchema.addDialect(dialect);

      expect(() => jsonSchema.addDialect(dialect)).to.throw("already defined");
    });

    test("a dialect can be replaced after it's removed", () => {
      jsonSchema.addDialect(dialect);
      jsonSchema.removeDialect(dialect.uri);

      expect(jsonSchema.hasDialect(dialect.uri)).to.equal(false);

      const replacement = { ...dialect, keywords: {} };
      jsonSchema.addDialect(replacement);
      expect(jsonSchema.getDialect(dialect.uri)).to.eql(replacement);
    });

    test("extendDialect", () => {
      jsonSchema.addDialect(dialect);
      const original = jsonSchema.getDialect(dialect.uri);
      jsonSchema.extendDialect(dialect.uri, {
        keywords: { foo: "https://example.com/keyword/foo" },
        formats: { bar: "https://example.com/format/bar" }
      });

      expect(jsonSchema.getDialect(dialect.uri)).to.eql({
        ...dialect,
        keywords: { ...dialect.keywords, foo: "https://example.com/keyword/foo" },
        formats: { bar: "https://example.com/format/bar" }
      });
      expect(original).to.eql(dialect);
    });

    test("extendDialect can't replace a keyword", () => {
      jsonSchema.addDialect(dialect);

      expect(() => jsonSchema.extendDialect(dialect.uri, { keywords: { $id: "https://example.com/keyword/id" } })).to.throw("already has");
      expect(() => jsonSchema.extendDialect(dialect.uri, { keywords: { $schema: "https://example.com/keyword/schema" } })).to.throw("already has");
    });

    test("extendDialect can't replace a format", () => {
      jsonSchema.addDialect({ ...dialect, formats: { bar: "https://example.com/format/bar" } });

      expect(() => jsonSchema.extendDialect(dialect.uri, { formats: { bar: "https://example.com/format/other" } })).to.throw("already has");
    });

    test("extendDialect for a dialect that isn't defined", () => {
      expect(() => jsonSchema.extendDialect(dialect.uri, {})).to.throw("isn't defined");
    });
  });

  describe("formats", () => {
    test("addFormat", () => {
      const format = { uri: "https://example.com/format/foo", validate: () => true };
      jsonSchema.addFormat(format);

      expect(jsonSchema.getFormat(format.uri)).to.equal(format);
    });

    test("a format that hasn't been added", () => {
      expect(() => jsonSchema.getFormat("https://example.com/format/nope")).to.throw("addFormat");
    });
  });

  describe("x- keywords are reserved", () => {
    const keywords = { "x-foo": "https://example.com/keyword/foo" };

    test("addDialect", () => {
      expect(() => jsonSchema.addDialect({ uri: "https://example.com/x", keywords, unknownKeywords: "error" })).to.throw("reserved");
      expect(jsonSchema.hasDialect("https://example.com/x")).to.equal(false);
    });

    test("extendDialect", () => {
      jsonSchema.addDialect({ uri: "https://example.com/x", keywords: {}, unknownKeywords: "error" });

      expect(() => jsonSchema.extendDialect("https://example.com/x", { keywords })).to.throw("reserved");
      expect(jsonSchema.getDialect("https://example.com/x").keywords).to.eql({});
    });
  });

  describe("sessions", () => {
    test("a dialect built from a meta-schema only belongs to the session", async () => {
      addVocabulary(jsonSchema, "https://example.com/vocab/core", { keywords: { $id: "https://json-schema.org/keyword/id" } });
      jsonSchema.addDialect({
        uri: "https://example.com/meta-dialect",
        keywords: { $id: "https://json-schema.org/keyword/id", $vocabulary: vocabularyKeyword.uri },
        unknownKeywords: "annotation"
      });
      const uri = "https://example.com/session-dialect";
      const registry = new SchemaRegistry().with({
        $schema: "https://example.com/meta-dialect",
        $id: uri,
        $vocabulary: { "https://example.com/vocab/core": true }
      });
      const session = jsonSchema.session({ registries: [registry] });

      expect(await session.getDialect(uri)).to.eql({ uri, keywords: { $id: "https://json-schema.org/keyword/id" }, unknownKeywords: "annotation", formats: {}, assertFormats: false });
      expect(session.hasDialect(uri)).to.equal(true);
      expect(jsonSchema.hasDialect(uri)).to.equal(false);
      expect(jsonSchema.session().hasDialect(uri)).to.equal(false);
    });

    test("a session sees dialects added to its JsonSchema", async () => {
      /** @type Dialect */
      const dialect = { uri: "https://example.com/added-dialect", keywords: {}, unknownKeywords: "annotation" };
      jsonSchema.addDialect(dialect);
      const session = jsonSchema.session();

      expect(session.hasDialect(dialect.uri)).to.equal(true);
      expect(await session.getDialect(dialect.uri)).to.eql(dialect);
    });

    test("each compile has its own session, so it sees changes", async () => {
      const directory = await mkdtemp(join(tmpdir(), "json-schema-next-"));
      try {
        const path = join(directory, "schema.schema.json");
        const uri = pathToFileURL(path).toString();

        await writeFile(path, JSON.stringify({ $schema: v1DialectUri, type: "string" }));
        expect((await jsonSchema.compile(uri)).validate(42)).to.equal(false);

        await writeFile(path, JSON.stringify({ $schema: v1DialectUri, type: "number" }));
        expect((await jsonSchema.compile(uri)).validate(42)).to.equal(true);
      } finally {
        await rm(directory, { recursive: true });
      }
    });

    test("a schema can't be retrieved without a JsonSchemaSession", async () => {
      const directory = await mkdtemp(join(tmpdir(), "json-schema-next-"));
      try {
        const path = join(directory, "schema.schema.json");
        await writeFile(path, JSON.stringify({ $schema: v1DialectUri }));

        await expect(new Session(jsonSchema).get(pathToFileURL(path).toString())).rejects.toMatchObject({
          cause: { message: expect.stringContaining("JsonSchemaSession") }
        });
      } finally {
        await rm(directory, { recursive: true });
      }
    });
  });

  describe("keywords", () => {
    test("addKeyword", () => {
      const keyword = { uri: "https://example.com/keyword/foo", shape: /** @type const */ ("data"), schema: anyValue };
      jsonSchema.addKeyword(keyword);

      expect(jsonSchema.getKeyword(keyword.uri)).to.equal(keyword);
    });

    test("a keyword that hasn't been added", () => {
      expect(() => jsonSchema.getKeyword("https://example.com/keyword/foo")).to.throw("isn't supported");
    });

    test("every built-in keyword's schema is found by the keyword's URI", async () => {
      const directory = new URL("./keywords/", import.meta.url);
      const files = await readdir(directory, { recursive: true });
      const keywordFiles = files.filter((file) => file.endsWith(".js") && !file.endsWith(".test.js") && file !== "utilities.js");
      expect(keywordFiles.length).to.be.greaterThan(0);

      for (const file of keywordFiles) {
        const { default: keyword } = /** @type {{ default: Keyword }} */ (await import(new URL(file, directory).href));
        const builtIn = new JsonSchema();
        builtIn.addKeyword(keyword);
        // Nothing can be retrieved, so the schema has to be the keyword's
        builtIn.removeUriSchemePlugin("http");
        builtIn.removeUriSchemePlugin("https");

        const session = builtIn.session();
        expect(await session.get(keyword.uri), file).to.include({ type: "json-schema", location: `${keyword.uri}#` });
      }
    });

    test("a keyword's schema can have an $id that's the keyword's URI", () => {
      const uri = "https://example.com/keyword/foo";

      expect(() => jsonSchema.addKeyword({ uri, shape: "data", schema: { $schema: v1DialectUri, $id: uri } })).not.to.throw();
    });

    test("a keyword's schema can't have any other $id", () => {
      const keyword = { uri: "https://example.com/keyword/foo", shape: /** @type const */ ("data"), schema: { $schema: v1DialectUri, $id: "https://example.com/other" } };

      expect(() => jsonSchema.addKeyword(keyword)).to.throw("keyword's URI");
      expect(jsonSchema.hasKeyword(keyword.uri)).to.equal(false);
    });

    test("a keyword's schema is resolved once for every session", async () => {
      const uri = "https://json-schema.org/keyword/type";

      const first = await jsonSchema.session().getDocument(uri);
      const second = await jsonSchema.session().getDocument(uri);

      expect(second).to.equal(first);
    });

    test.each([
      "https://json-schema.org/keyword/schema",
      "https://json-schema.org/keyword/unknown"
    ])("'%s' is added by default", (uri) => {
      expect(jsonSchema.getKeyword(uri)).to.include({ uri, shape: "data" });
    });
  });
});
