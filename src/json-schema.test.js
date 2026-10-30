import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeEach, expect } from "vitest";
import { Session } from "@hyperjump/browser";
import { pointerGet } from "@hyperjump/browser/json";
import { JsonSchema, extendDialect } from "./json-schema.js";
import { v1Dialect, v1DialectUri } from "./dialects/v1/index.js";
import { SchemaRegistry } from "./registry/schema-registry.js";
import { AnchorNotFoundError } from "./schema/media-type-plugin.js";
import vocabularyKeyword from "./keywords/vocabulary.js";
import idKeyword from "./keywords/id.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Dialect, DialectConfig } from "./dialect.d.ts"
 * @import { Keyword } from "./keyword.d.ts"
 */

describe("JsonSchema", () => {
  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = new JsonSchema({ allowRetrieval: [pathToFileURL(join(tmpdir(), "/")).href], dialects: [v1Dialect] });
  });

  describe("dialects", () => {
    /** @type DialectConfig */
    const dialect = {
      uri: "https://example.com/dialect",
      keywords: { $id: idKeyword },
      unknownKeywords: "error"
    };

    test("a dialect in the config", () => {
      const jsonSchema = new JsonSchema({ dialects: [dialect] });

      expect(jsonSchema.hasDialect(dialect.uri)).to.equal(true);
      expect(jsonSchema.getDialect(dialect.uri)).to.eql({ ...dialect, keywords: { $id: idKeyword.uri } });
      expect(jsonSchema.getKeyword(idKeyword.uri)).to.equal(idKeyword);
    });

    test("an empty fragment identifies the same dialect", () => {
      const jsonSchema = new JsonSchema({ dialects: [{ ...dialect, uri: `${dialect.uri}#` }] });

      expect(jsonSchema.hasDialect(dialect.uri)).to.equal(true);
      expect(jsonSchema.getDialect(dialect.uri)).to.include({ uri: dialect.uri });
    });

    test("a dialect can't be in the config twice", () => {
      expect(() => new JsonSchema({ dialects: [dialect, { ...dialect, keywords: {} }] })).to.throw("more than once");
    });

    test("a dialect that isn't in the config", () => {
      expect(() => jsonSchema.getDialect(dialect.uri)).to.throw("isn't defined");
    });

    test("a keyword named by URI comes from the config's keywords", () => {
      const foo = { uri: "https://example.com/keyword/foo", shape: /** @type const */ ("data") };
      const jsonSchema = new JsonSchema({ dialects: [{ ...dialect, keywords: { foo: foo.uri } }], keywords: [foo] });

      expect(jsonSchema.getKeyword(foo.uri)).to.equal(foo);
    });

    test("a keyword named by URI that isn't defined", () => {
      expect(() => new JsonSchema({ dialects: [{ ...dialect, keywords: { foo: "https://example.com/keyword/foo" } }] }))
        .to.throw("no definition for the 'https://example.com/keyword/foo' keyword");
    });

    test("a format named by URI that isn't defined isn't supported", () => {
      const jsonSchema = new JsonSchema({ dialects: [{ ...dialect, formats: { bar: "https://example.com/format/bar" } }] });

      expect(jsonSchema.getDialect(dialect.uri).formats).to.eql({ bar: "https://example.com/format/bar" });
      expect(jsonSchema.hasFormat("https://example.com/format/bar")).to.equal(false);
    });

    test("extendDialect", () => {
      const foo = { uri: "https://example.com/keyword/foo", shape: /** @type const */ ("data") };
      const bar = { uri: "https://example.com/format/bar", validate: () => true };
      const extended = extendDialect(dialect, { keywords: { foo }, formats: { bar } });

      expect(extended).to.eql({ ...dialect, keywords: { ...dialect.keywords, foo }, formats: { bar } });
      expect(dialect.keywords).to.eql({ $id: idKeyword });
    });

    test("extendDialect can't replace a keyword", () => {
      expect(() => extendDialect(dialect, { keywords: { $id: "https://example.com/keyword/id" } })).to.throw("already has");
      expect(() => extendDialect(dialect, { keywords: { $schema: "https://example.com/keyword/schema" } })).to.throw("already has");
    });

    test("extendDialect can't replace a format", () => {
      const withFormat = { ...dialect, formats: { bar: "https://example.com/format/bar" } };

      expect(() => extendDialect(withFormat, { formats: { bar: "https://example.com/format/other" } })).to.throw("already has");
    });
  });

  describe("keywords", () => {
    test("one in the config replaces a dialect's", () => {
      const replacement = { ...idKeyword, check: () => {} };
      const jsonSchema = new JsonSchema({ dialects: [v1Dialect], keywords: [replacement] });

      expect(jsonSchema.getKeyword(idKeyword.uri)).to.equal(replacement);
    });

    test("a keyword that isn't defined", () => {
      expect(() => jsonSchema.getKeyword("https://example.com/keyword/nope")).to.throw("'keywords' config");
    });
  });

  describe("formats", () => {
    test("a format in the config", () => {
      const format = { uri: "https://example.com/format/foo", validate: () => true };
      const jsonSchema = new JsonSchema({ formats: [format] });

      expect(jsonSchema.getFormat(format.uri)).to.equal(format);
    });

    test("a format that isn't defined", () => {
      expect(() => jsonSchema.getFormat("https://example.com/format/nope")).to.throw("'formats' config");
    });
  });

  describe("x- keywords are reserved", () => {
    const keywords = { "x-foo": "https://example.com/keyword/foo" };

    test("in a dialect", () => {
      expect(() => new JsonSchema({ dialects: [{ uri: "https://example.com/x", keywords, unknownKeywords: "error" }] })).to.throw("reserved");
    });

    test("extendDialect", () => {
      expect(() => extendDialect({ uri: "https://example.com/x", keywords: {}, unknownKeywords: "error" }, { keywords })).to.throw("reserved");
    });
  });

  describe("sessions", () => {
    test("a dialect built from a meta-schema only belongs to the session", async () => {
      const jsonSchema = new JsonSchema({
        dialects: [{
          uri: "https://example.com/meta-dialect",
          keywords: { $id: idKeyword, $vocabulary: vocabularyKeyword },
          unknownKeywords: "annotation",
          vocabularies: { "https://example.com/vocab/core": { keywords: { $id: idKeyword } } }
        }]
      });
      const uri = "https://example.com/session-dialect";
      const registry = new SchemaRegistry().with({
        $schema: "https://example.com/meta-dialect",
        $id: uri,
        $vocabulary: { "https://example.com/vocab/core": true }
      });
      const session = jsonSchema.session({ registry });

      expect(await session.getDialect(uri)).to.eql({ uri, keywords: { $id: "https://json-schema.org/keyword/id" }, unknownKeywords: "annotation", formats: {}, assertFormats: false });
      expect(session.hasDialect(uri)).to.equal(true);
      expect(jsonSchema.hasDialect(uri)).to.equal(false);
      expect(jsonSchema.session().hasDialect(uri)).to.equal(false);
    });

    test("a session sees the dialects in its JsonSchema's config", async () => {
      /** @type Dialect */
      const dialect = { uri: "https://example.com/added-dialect", keywords: {}, unknownKeywords: "annotation" };
      const session = new JsonSchema({ dialects: [dialect] }).session();

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

  describe("a URI identifies one resource in a session", () => {
    // trusted → trusted-sub → common
    const trusted = new SchemaRegistry()
      .with({
        $schema: v1DialectUri,
        $id: "https://example.com/trusted",
        $ref: "https://example.com/trusted-sub",
        $defs: {
          sub: { $id: "https://example.com/trusted-sub", $ref: "https://example.com/common" }
        }
      })
      .with({ $schema: v1DialectUri, $id: "https://example.com/common", type: "string" });

    /** @type (defs: Record<string, Json>) => SchemaRegistry */
    const other = (defs) => new SchemaRegistry().with({
      $schema: v1DialectUri,
      $id: "https://example.com/other",
      $ref: "https://example.com/trusted",
      $defs: defs
    });

    beforeEach(() => {
      jsonSchema.registry = trusted;
    });

    test("a document can't change what a reference in another document finds", async () => {
      const session = jsonSchema.session({
        registry: other({
          sub: { $id: "https://example.com/trusted-sub" },
          common: { $id: "https://example.com/common", type: "number" }
        })
      });

      await expect(session.compile("https://example.com/other")).rejects.toMatchObject({
        name: "SchemaError",
        messages: [{
          ruleId: "duplicate-id",
          uri: "https://example.com/trusted",
          message: "'https://example.com/other' has a different schema resource identified as 'https://example.com/trusted-sub'"
        }]
      });
    });

    test("an identical resource can't bring different resources with it", async () => {
      const session = jsonSchema.session({
        registry: other({
          sub: { $id: "https://example.com/trusted-sub", $ref: "https://example.com/common" },
          common: { $id: "https://example.com/common", type: "number" }
        })
      });

      await expect(session.compile("https://example.com/other")).rejects.toMatchObject({
        name: "SchemaError",
        messages: [{
          ruleId: "duplicate-id",
          uri: "https://example.com/common",
          message: "'https://example.com/other' has a different schema resource identified as 'https://example.com/common'"
        }]
      });
    });

    test("an identical resource can be in more than one document", async () => {
      const session = jsonSchema.session({
        registry: other({
          sub: { $id: "https://example.com/trusted-sub", $ref: "https://example.com/common" },
          common: { $id: "https://example.com/common", type: "string" }
        })
      });

      expect((await session.compile("https://example.com/other")).validate(42)).to.equal(false);
      expect((await session.compile("https://example.com/trusted")).validate(42)).to.equal(false);
    });

    test("an embedded resource and a document with the same URI", async () => {
      const session = jsonSchema.session({
        registry: new SchemaRegistry().with({
          $schema: v1DialectUri,
          $id: "https://example.com/other",
          $ref: "https://example.com/common",
          $defs: {
            common: { $id: "https://example.com/common", type: "number" }
          }
        })
      });

      expect((await session.compile("https://example.com/other")).validate(42)).to.equal(true);
      await expect(session.compile("https://example.com/common")).rejects.toMatchObject({
        name: "SchemaError",
        messages: [{
          ruleId: "duplicate-id",
          uri: "https://example.com/common",
          message: "'https://example.com/other' has a different schema resource identified as 'https://example.com/common'"
        }]
      });
    });
  });

  describe("annotations", () => {
    beforeEach(() => {
      jsonSchema.registry = new SchemaRegistry().with({
        $schema: v1DialectUri,
        $id: "https://example.com/annotated",
        title: "root",
        allOf: [{ "x-foo": "bar" }],
        properties: {
          foo: { title: "foo", allOf: [{ title: "also foo" }] },
          bar: { description: "bar" }
        },
        propertyNames: { title: "name" }
      });
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
      const other = new JsonSchema({
        dialects: [v1Dialect, { uri: "https://example.com/dialect", keywords: { label: "https://json-schema.org/keyword/title" }, unknownKeywords: "error" }]
      });
      other.registry = jsonSchema.registry;
      const { node } = await other.annotate("https://example.com/annotated", {});
      const session = other.session();

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
      jsonSchema.registry = new SchemaRegistry().with({
        $schema: v1DialectUri,
        $id: "https://example.com/anchor",
        $ref: "#foo",
        $defs: { foo: { $anchor: "foo", type: "string" } }
      });
      expect((await jsonSchema.compile("https://example.com/anchor")).validate(42)).to.equal(false);
    });

    test("an anchor that isn't in the document", async () => {
      jsonSchema.registry = new SchemaRegistry().with({ $schema: v1DialectUri, $id: "https://example.com/no-anchor", $ref: "#foo" });
      const error = await jsonSchema.compile("https://example.com/no-anchor")
        .catch((/** @type unknown */ error) => error);
      expect(error).to.be.instanceOf(AnchorNotFoundError);
      expect(error).toMatchObject({ anchor: "foo", uri: "https://example.com/no-anchor", message: "There's no 'foo' anchor in 'https://example.com/no-anchor'" });
    });

    test("a percent-encoded JSON Pointer", async () => {
      jsonSchema.registry = new SchemaRegistry().with({
        $schema: v1DialectUri,
        $id: "https://example.com/pointer",
        $ref: "#%2F$defs%2Ffoo",
        $defs: { foo: { type: "string" } }
      });
      expect((await jsonSchema.compile("https://example.com/pointer")).validate(42)).to.equal(false);
    });
  });

  describe("built-in keywords", () => {
    test.each([
      "https://json-schema.org/keyword/schema",
      "https://json-schema.org/keyword/unknown"
    ])("'%s' is added by default", (uri) => {
      expect(jsonSchema.getKeyword(uri)).to.include({ uri, shape: "data" });
    });
  });
});
