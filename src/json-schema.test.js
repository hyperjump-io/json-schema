import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeEach, expect } from "vitest";
import { Session } from "@hyperjump/browser";
import { pointerGet } from "@hyperjump/browser/json";
import { JsonSchema } from "./json-schema.js";
import { addV1, v1DialectUri } from "./dialects/v1/index.js";
import { SchemaRegistry } from "./registry/schema-registry.js";
import { AnchorNotFoundError } from "./schema/media-type-plugin.js";
import vocabularyKeyword, { addVocabulary } from "./keywords/vocabulary.js";

/**
 * @import { Dialect } from "./dialect.d.ts"
 * @import { Keyword } from "./keyword.d.ts"
 */

describe("JsonSchema", () => {
  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = new JsonSchema({ allowRetrieval: () => true });
    addV1(jsonSchema);
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
      const directory = await mkdtemp(join(tmpdir(), "json-schema-"));
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
      const directory = await mkdtemp(join(tmpdir(), "json-schema-"));
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

  describe("annotations", () => {
    beforeEach(() => {
      jsonSchema.addRegistry(new SchemaRegistry().with({
        $schema: v1DialectUri,
        $id: "https://example.com/annotated",
        title: "root",
        allOf: [{ "x-foo": "bar" }],
        properties: {
          foo: { title: "foo", allOf: [{ title: "also foo" }] },
          bar: { description: "bar" }
        },
        propertyNames: { title: "name" }
      }));
    });

    test("annotation by name in the v1 dialect", async () => {
      const { node } = await jsonSchema.annotate("https://example.com/annotated", { foo: 1, bar: 2 });
      const session = jsonSchema.session();

      expect(session.annotation(node, "title")).to.eql(["root"]);
      expect(session.annotation(pointerGet("/foo", /** @type any */ (node)), "title")).to.eql(["foo", "also foo"]);
      expect(session.annotation(pointerGet("/bar", /** @type any */ (node)), "title")).to.eql([]);
    });

    test("annotation by keyword URI", async () => {
      const { node } = await jsonSchema.annotate("https://example.com/annotated", {});

      expect(jsonSchema.session().annotation(node, "https://json-schema.org/keyword/title")).to.eql(["root"]);
    });

    test("annotation by unknown keyword name", async () => {
      const { node } = await jsonSchema.annotate("https://example.com/annotated", {});

      expect(jsonSchema.session().annotation(node, "x-foo")).to.eql(["bar"]);
    });

    test("annotation by unknown keyword URI", async () => {
      const { node } = await jsonSchema.annotate("https://example.com/annotated", {});

      expect(jsonSchema.session().annotation(node, "https://json-schema.org/keyword/unknown#x-foo")).to.eql(["bar"]);
    });

    test("annotation by keyword URI doesn't need the dialect", async () => {
      const { node } = await jsonSchema.annotate("https://example.com/annotated", {});

      expect(jsonSchema.session().annotation(node, "https://json-schema.org/keyword/title", "https://example.com/dialect")).to.eql(["root"]);
    });

    test("annotation by name with property names", async () => {
      const { node } = await jsonSchema.annotate("https://example.com/annotated", { foo: 1 });
      const nameNode = /** @type any */ (node).children[0].children[0];

      expect(jsonSchema.session().annotation(nameNode, "title")).to.eql(["name"]);
    });

    test("annotation by name in another dialect", async () => {
      jsonSchema.addDialect({ uri: "https://example.com/dialect", keywords: { label: "https://json-schema.org/keyword/title" }, unknownKeywords: "error" });
      const { node } = await jsonSchema.annotate("https://example.com/annotated", {});
      const session = jsonSchema.session();

      expect(session.annotation(node, "label", "https://example.com/dialect")).to.eql(["root"]);
      expect(session.annotation(node, "title", "https://example.com/dialect")).to.eql([]);
    });

    test("annotation by name in a dialect that isn't defined", async () => {
      const { node } = await jsonSchema.annotate("https://example.com/annotated", {});

      expect(() => jsonSchema.session().annotation(node, "title", "https://example.com/dialect")).to.throw("isn't defined");
    });
  });

  describe("fragments", () => {
    test("an anchor", async () => {
      jsonSchema.addRegistry(new SchemaRegistry().with({
        $schema: v1DialectUri,
        $id: "https://example.com/anchor",
        $ref: "#foo",
        $defs: { foo: { $anchor: "foo", type: "string" } }
      }));
      expect((await jsonSchema.compile("https://example.com/anchor")).validate(42)).to.equal(false);
    });

    test("an anchor that isn't in the document", async () => {
      jsonSchema.addRegistry(new SchemaRegistry().with({ $schema: v1DialectUri, $id: "https://example.com/no-anchor", $ref: "#foo" }));
      const error = await jsonSchema.compile("https://example.com/no-anchor")
        .catch((/** @type unknown */ error) => error);
      expect(error).to.be.instanceOf(AnchorNotFoundError);
      expect(error).toMatchObject({ anchor: "foo", uri: "https://example.com/no-anchor", message: "There's no 'foo' anchor in 'https://example.com/no-anchor'" });
    });

    test("a percent-encoded JSON Pointer", async () => {
      jsonSchema.addRegistry(new SchemaRegistry().with({
        $schema: v1DialectUri,
        $id: "https://example.com/pointer",
        $ref: "#%2F$defs%2Ffoo",
        $defs: { foo: { type: "string" } }
      }));
      expect((await jsonSchema.compile("https://example.com/pointer")).validate(42)).to.equal(false);
    });
  });

  describe("keywords", () => {
    test("addKeyword", () => {
      const keyword = { uri: "https://example.com/keyword/foo", shape: /** @type const */ ("data") };
      jsonSchema.addKeyword(keyword);

      expect(jsonSchema.getKeyword(keyword.uri)).to.equal(keyword);
    });

    test("a keyword that hasn't been added", () => {
      expect(() => jsonSchema.getKeyword("https://example.com/keyword/foo")).to.throw("isn't supported");
    });

    test.each([
      "https://json-schema.org/keyword/schema",
      "https://json-schema.org/keyword/unknown"
    ])("'%s' is added by default", (uri) => {
      expect(jsonSchema.getKeyword(uri)).to.include({ uri, shape: "data" });
    });
  });
});
