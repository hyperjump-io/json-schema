import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { describe, test, beforeEach, expect } from "vitest";
import { createServer } from "node:http";
import { defaultMediaTypes, fetcher, get, Hyperjump, jsonPointerGet } from "@hyperjump/browser";
import { JsonSchema, extendDialect } from "./json-schema.js";
import { v1Dialect, v1DialectUri } from "./dialects/v1/index.js";
import { SchemaRegistry } from "./registry/schema-registry.js";
import vocabularyKeyword from "./keywords/vocabulary.js";
import idKeyword from "./keywords/id.js";
import { compile } from "./operations/compile.js";
import { annotate } from "./operations/validate.js";
import { validatorFor } from "./operations/validate-compiled.js";
import { annotation, getDialect, getDocument, hasDialect } from "./session.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Dialect, DialectConfig, VocabularyConfig } from "./dialect.d.ts"
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

  describe("config", () => {
    test("its lists are frozen copies", () => {
      const dialects = [v1Dialect];
      const keywords = [idKeyword];
      const vocabularies = /** @type Record<string, VocabularyConfig> */ ({});
      const config = { dialects, keywords, formats: [], vocabularies };
      const jsonSchema = new JsonSchema(config);

      expect(jsonSchema.config.dialects).not.to.equal(dialects);
      expect(jsonSchema.config.keywords).not.to.equal(keywords);
      expect(jsonSchema.config.vocabularies).not.to.equal(vocabularies);
      expect(Object.isFrozen(jsonSchema.config.dialects)).to.equal(true);
      expect(Object.isFrozen(jsonSchema.config.keywords)).to.equal(true);
      expect(Object.isFrozen(jsonSchema.config.formats)).to.equal(true);
      expect(Object.isFrozen(jsonSchema.config.vocabularies)).to.equal(true);
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

      expect(await getDialect(session, uri)).to.eql({ uri, keywords: { $id: "https://json-schema.org/keyword/id" }, unknownKeywords: "annotation", formats: {}, assertFormats: false });
      expect(hasDialect(session, uri)).to.equal(true);
      expect(jsonSchema.hasDialect(uri)).to.equal(false);
      expect(hasDialect(jsonSchema.session(), uri)).to.equal(false);
    });

    test("a session sees the dialects in its JsonSchema's config", async () => {
      /** @type Dialect */
      const dialect = { uri: "https://example.com/added-dialect", keywords: {}, unknownKeywords: "annotation" };
      const session = new JsonSchema({ dialects: [dialect] }).session();

      expect(hasDialect(session, dialect.uri)).to.equal(true);
      expect(await getDialect(session, dialect.uri)).to.eql(dialect);
    });

    test("sessions share an HTTP cache, so a schema isn't retrieved again", async () => {
      let requests = 0;
      const server = createServer((_request, response) => {
        requests++;
        response.writeHead(200, { "content-type": "application/schema+json", "cache-control": "max-age=60" });
        response.end(JSON.stringify({ $schema: v1DialectUri, type: "string" }));
      });
      await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(undefined)));
      try {
        const { port } = /** @type import("node:net").AddressInfo */ (server.address());
        const origin = `http://127.0.0.1:${port}/`;
        const cached = new JsonSchema({ dialects: [v1Dialect], allowRetrieval: [origin] });

        expect(validatorFor(await compile(cached, `${origin}schema`))(42)).to.equal(false);
        expect(validatorFor(await compile(cached, `${origin}schema`))(42)).to.equal(false);
        expect(requests).to.equal(1);
      } finally {
        server.close();
      }
    });

    test("sessions retrieve through the config's stack, as it is", async () => {
      let requests = 0;
      const stack = fetcher(() => {
        requests++;
        return new Response(JSON.stringify({ $schema: v1DialectUri, type: "string" }), {
          headers: { "content-type": "application/schema+json", "cache-control": "max-age=60" }
        });
      });
      const uncached = new JsonSchema({ dialects: [v1Dialect], allowRetrieval: ["https://example.com/"], stack });

      expect(uncached.stack).to.equal(stack);
      expect(validatorFor(await compile(uncached, "https://example.com/schema"))(42)).to.equal(false);
      expect(validatorFor(await compile(uncached, "https://example.com/schema"))(42)).to.equal(false);
      expect(requests).to.equal(2);
    });

    test("JSON is read as a schema even when the config has browser's media types", async () => {
      const stack = fetcher(() => new Response(JSON.stringify({ $schema: v1DialectUri, type: "string" }), {
        headers: { "content-type": "application/json" }
      }));
      const withDefaults = new JsonSchema({ dialects: [v1Dialect], allowRetrieval: ["https://example.com/"], stack, mediaTypes: [...defaultMediaTypes] });

      expect((await getDocument(withDefaults.session(), "https://example.com/schema")).type).to.equal("json-schema-document");
    });

    test("each compile has its own session, so it sees changes", async () => {
      const directory = await mkdtemp(join(tmpdir(), "json-schema-"));
      try {
        const path = join(directory, "schema.schema.json");
        const uri = pathToFileURL(path).toString();

        await writeFile(path, JSON.stringify({ $schema: v1DialectUri, type: "string" }));
        expect(validatorFor(await compile(jsonSchema, uri))(42)).to.equal(false);

        await writeFile(path, JSON.stringify({ $schema: v1DialectUri, type: "number" }));
        expect(validatorFor(await compile(jsonSchema, uri))(42)).to.equal(true);
      } finally {
        await rm(directory, { recursive: true });
      }
    });

    test("a schema can't be retrieved in a session that isn't a JsonSchema's", async () => {
      const directory = await mkdtemp(join(tmpdir(), "json-schema-"));
      try {
        const path = join(directory, "schema.schema.json");
        await writeFile(path, JSON.stringify({ $schema: v1DialectUri }));

        const session = new Hyperjump({ mediaTypes: jsonSchema.config.mediaTypes, allowRetrieval: [pathToFileURL(join(directory, "/")).href] });
        await expect(get(session, pathToFileURL(path).toString())).rejects.toThrow("A schema can only be retrieved in a session of a JsonSchema");
      } finally {
        await rm(directory, { recursive: true });
      }
    });

    test("a relative URI is resolved against the working directory", async () => {
      const directory = await mkdtemp(join(cwd(), ".json-schema-test-"));
      try {
        const path = join(directory, "schema.schema.json");
        await writeFile(path, JSON.stringify({ $schema: v1DialectUri, type: "string" }));

        const session = new JsonSchema({ dialects: [v1Dialect] }).session();
        const document = await getDocument(session, relative(cwd(), path));
        expect(/** @type import("./schema/schema-ast.d.ts").JsonSchemaDocumentNode */ (/** @type unknown */ (document)).uri).to.equal(pathToFileURL(path).href);
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

      await expect(compile(session, "https://example.com/other")).rejects.toMatchObject({
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

      await expect(compile(session, "https://example.com/other")).rejects.toMatchObject({
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

      expect(validatorFor(await compile(session, "https://example.com/other"))(42)).to.equal(false);
      expect(validatorFor(await compile(session, "https://example.com/trusted"))(42)).to.equal(false);
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

      expect(validatorFor(await compile(session, "https://example.com/other"))(42)).to.equal(true);
      await expect(compile(session, "https://example.com/common")).rejects.toMatchObject({
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
      const { node } = await annotate(jsonSchema, "https://example.com/annotated", { foo: 1, bar: 2 });
      const session = jsonSchema.session();

      expect(annotation(session, node, "title")).to.eql(["root"]);
      expect(annotation(session, jsonPointerGet("/foo", /** @type any */ (node)), "title")).to.eql(["foo", "also foo"]);
      expect(annotation(session, jsonPointerGet("/bar", /** @type any */ (node)), "title")).to.eql([]);
    });

    test("annotation by keyword URI", async () => {
      const { node } = await annotate(jsonSchema, "https://example.com/annotated", {});

      expect(annotation(jsonSchema.session(), node, "https://json-schema.org/keyword/title")).to.eql(["root"]);
    });

    test("annotation by unknown keyword name", async () => {
      const { node } = await annotate(jsonSchema, "https://example.com/annotated", {});

      expect(annotation(jsonSchema.session(), node, "x-foo")).to.eql(["bar"]);
    });

    test("annotation by unknown keyword URI", async () => {
      const { node } = await annotate(jsonSchema, "https://example.com/annotated", {});

      expect(annotation(jsonSchema.session(), node, "https://json-schema.org/keyword/unknown#x-foo")).to.eql(["bar"]);
    });

    test("annotation by keyword URI doesn't need the dialect", async () => {
      const { node } = await annotate(jsonSchema, "https://example.com/annotated", {});

      expect(annotation(jsonSchema.session(), node, "https://json-schema.org/keyword/title", "https://example.com/dialect")).to.eql(["root"]);
    });

    test("annotation by name with property names", async () => {
      const { node } = await annotate(jsonSchema, "https://example.com/annotated", { foo: 1 });
      const nameNode = /** @type any */ (node).children[0].children[0];

      expect(annotation(jsonSchema.session(), nameNode, "title")).to.eql(["name"]);
    });

    test("annotation by name in another dialect", async () => {
      const other = new JsonSchema({
        dialects: [v1Dialect, { uri: "https://example.com/dialect", keywords: { label: "https://json-schema.org/keyword/title" }, unknownKeywords: "error" }]
      });
      other.registry = jsonSchema.registry;
      const { node } = await annotate(other, "https://example.com/annotated", {});
      const session = other.session();

      expect(annotation(session, node, "label", "https://example.com/dialect")).to.eql(["root"]);
      expect(annotation(session, node, "title", "https://example.com/dialect")).to.eql([]);
    });

    test("annotation by name in a dialect that isn't defined", async () => {
      const { node } = await annotate(jsonSchema, "https://example.com/annotated", {});

      expect(() => annotation(jsonSchema.session(), node, "title", "https://example.com/dialect")).to.throw("isn't defined");
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
      expect(validatorFor(await compile(jsonSchema, "https://example.com/anchor"))(42)).to.equal(false);
    });

    test("an anchor that isn't in the document", async () => {
      jsonSchema.registry = new SchemaRegistry().with({ $schema: v1DialectUri, $id: "https://example.com/no-anchor", $ref: "#foo" });
      const error = await compile(jsonSchema, "https://example.com/no-anchor")
        .catch((/** @type unknown */ error) => error);
      expect(error).toMatchObject({
        cause: { code: "ERR_ANCHOR_NOT_FOUND", anchor: "foo" },
        url: "https://example.com/no-anchor",
        message: "There's no 'foo' anchor in 'https://example.com/no-anchor'"
      });
    });

    test("a percent-encoded JSON Pointer", async () => {
      jsonSchema.registry = new SchemaRegistry().with({
        $schema: v1DialectUri,
        $id: "https://example.com/pointer",
        $ref: "#%2F$defs%2Ffoo",
        $defs: { foo: { type: "string" } }
      });
      expect(validatorFor(await compile(jsonSchema, "https://example.com/pointer"))(42)).to.equal(false);
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
