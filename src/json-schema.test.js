import { toId } from "./identifiers.js";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { describe, test, beforeEach, expect } from "vitest";
import { createServer } from "node:http";
import { defaultMediaTypes, fetcher, get, Hyperjump, jsonPointerGet, jsonValue, MemoryCacheStore, Trace, jrefMediaType } from "@hyperjump/browser";
import { jsonSchemaConfig, extendDialect } from "./json-schema.js";
import { jsonSchemaMediaTypes } from "./media-types.js";
import { v1Dialect, v1DialectUri } from "./dialects/v1/index.js";
import { draft07Dialect } from "./dialects/draft-07/index.js";
import { SchemaRegistry } from "./registry/schema-registry.js";
import vocabularyKeyword from "./keywords/vocabulary.js";
import idKeyword from "./keywords/id.js";
import { compile } from "./operations/compile.js";
import { annotate, validate } from "./operations/validate.js";
import { validatorFor } from "./operations/validate-compiled.js";
import { getDialect, getDocument, hasDialect } from "./session.js";
import { annotation } from "./annotation.js";
import { definitionsOf } from "./definition-of.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Dialect, DialectConfig, VocabularyConfig } from "./dialect.d.ts"
 * @import { Keyword } from "./keyword.d.ts"
 * @import { JsonSchemaConfig } from "./json-schema.d.ts"
 */

describe("jsonSchemaMediaTypes", () => {
  /** @type JsonSchemaConfig */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = jsonSchemaConfig({
      dialects: [v1Dialect],
      allowRetrieval: [pathToFileURL(join(tmpdir(), "/")).href]
    });
  });

  describe("dialects", () => {
    /** @type DialectConfig */
    const dialect = {
      uri: "https://example.com/dialect",
      keywords: { $id: idKeyword },
      unknownKeywords: "error"
    };

    test("a dialect in the config", () => {
      const jsonSchema = jsonSchemaConfig({ dialects: [dialect] });

      expect(toId(dialect.uri) in definitionsOf(jsonSchema).dialects).to.equal(true);
      expect(definitionsOf(jsonSchema).dialects[toId(dialect.uri)]).to.eql({ ...dialect, keywords: { $id: idKeyword.uri } });
      expect(definitionsOf(jsonSchema).keywords[idKeyword.uri]).to.equal(idKeyword);
    });

    test("an empty fragment identifies the same dialect", () => {
      const jsonSchema = jsonSchemaConfig({ dialects: [{ ...dialect, uri: `${dialect.uri}#` }] });

      expect(toId(dialect.uri) in definitionsOf(jsonSchema).dialects).to.equal(true);
      expect(definitionsOf(jsonSchema).dialects[toId(dialect.uri)]).to.include({ uri: dialect.uri });
    });

    test("a dialect can't be in the config twice", () => {
      expect(() => jsonSchemaConfig({ dialects: [dialect, { ...dialect, keywords: {} }] })).to.throw("more than once");
    });

    test("a dialect that isn't in the config", () => {
      expect(definitionsOf(jsonSchema).dialects[toId(dialect.uri)]).to.equal(undefined);
    });

    test("a keyword named by URI comes from the config's keywords", () => {
      const foo = { uri: "https://example.com/keyword/foo", shape: /** @type const */ ("data") };
      const jsonSchema = jsonSchemaConfig({
        dialects: [{ ...dialect, keywords: { foo: foo.uri } }],
        keywords: [foo]
      });

      expect(definitionsOf(jsonSchema).keywords[foo.uri]).to.equal(foo);
    });

    test("a keyword named by URI that isn't defined", () => {
      expect(() => jsonSchemaConfig({
        dialects: [{ ...dialect, keywords: { foo: "https://example.com/keyword/foo" } }]
      }))
        .to.throw("no definition for the 'https://example.com/keyword/foo' keyword");
    });

    test("a format named by URI that isn't defined isn't supported", () => {
      const jsonSchema = jsonSchemaConfig({
        dialects: [{ ...dialect, formats: { bar: "https://example.com/format/bar" } }]
      });

      expect(definitionsOf(jsonSchema).dialects[toId(dialect.uri)].formats).to.eql({ bar: "https://example.com/format/bar" });
      expect("https://example.com/format/bar" in definitionsOf(jsonSchema).formats).to.equal(false);
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

  describe("media types", () => {
    test("JSON Schema, then JSON that can be a schema, which are frozen", () => {
      const mediaTypes = jsonSchemaMediaTypes({ dialects: [v1Dialect] });

      expect(mediaTypes.map((plugin) => plugin.mediaType)).to.eql(["application/schema+json", "application/json"]);
      expect(Object.isFrozen(mediaTypes)).to.equal(true);
      expect(Object.isFrozen(mediaTypes[0])).to.equal(true);
    });

    test("jsonSchemaConfig puts them before the options' media types, and keeps browser's options", () => {
      const config = jsonSchemaConfig({ dialects: [v1Dialect], mediaTypes: [jrefMediaType], allowRetrieval: ["./"] });

      expect(config.mediaTypes.map((plugin) => plugin.mediaType)).to.eql(["application/schema+json", "application/json", "application/reference+json"]);
      expect(config.allowRetrieval).to.eql(["./"]);
      expect(Object.keys(config).sort()).to.eql(["allowRetrieval", "mediaTypes"]);
    });

    test("a config without them can't be used", async () => {
      await expect(validate(/** @type any */ ({}), true, 42)).rejects.toThrow("no JSON Schema media types");
    });
  });

  describe("keywords", () => {
    test("one in the config replaces a dialect's", () => {
      const replacement = { ...idKeyword, check: () => {} };
      const jsonSchema = jsonSchemaConfig({ dialects: [v1Dialect], keywords: [replacement] });

      expect(definitionsOf(jsonSchema).keywords[idKeyword.uri]).to.equal(replacement);
    });

    test("a keyword that isn't defined", () => {
      expect(definitionsOf(jsonSchema).keywords["https://example.com/keyword/nope"]).to.equal(undefined);
    });

    test("the definitions have no prototype", () => {
      expect("constructor" in definitionsOf(jsonSchema).keywords).to.equal(false);
      expect("constructor" in definitionsOf(jsonSchema).dialects).to.equal(false);
    });

    test("the definitions are frozen", () => {
      expect(Object.isFrozen(definitionsOf(jsonSchema).keywords)).to.equal(true);
      expect(Object.isFrozen(definitionsOf(jsonSchema).formats)).to.equal(true);
      expect(Object.isFrozen(definitionsOf(jsonSchema).dialects)).to.equal(true);
      expect(Object.isFrozen(definitionsOf(jsonSchema).vocabularies)).to.equal(true);
    });
  });

  describe("formats", () => {
    test("a format in the config", () => {
      const format = { uri: "https://example.com/format/foo", validate: () => true };
      const jsonSchema = jsonSchemaConfig({ formats: [format] });

      expect(definitionsOf(jsonSchema).formats[format.uri]).to.equal(format);
    });

    test("a format that isn't defined", () => {
      expect(definitionsOf(jsonSchema).formats["https://example.com/format/nope"]).to.equal(undefined);
    });
  });

  describe("x- keywords are reserved", () => {
    const keywords = { "x-foo": "https://example.com/keyword/foo" };

    test("in a dialect", () => {
      expect(() => jsonSchemaConfig({
        dialects: [{ uri: "https://example.com/x", keywords, unknownKeywords: "error" }]
      })).to.throw("reserved");
    });

    test("extendDialect", () => {
      expect(() => extendDialect({ uri: "https://example.com/x", keywords: {}, unknownKeywords: "error" }, { keywords })).to.throw("reserved");
    });
  });

  describe("sessions", () => {
    test("a session is browser's, so it's traced and closed like any other", async () => {
      const registry = new SchemaRegistry().with({ $schema: v1DialectUri, $id: "https://example.com/registered" });
      const session = new Hyperjump(jsonSchemaConfig({ dialects: [v1Dialect], allowRetrieval: [], registry }));

      const trace = new Trace(session);
      await get(session, "https://example.com/registered");
      await expect(get(session, "https://example.com/schema")).rejects.toThrow();
      expect(trace.records.map((record) => [record.url, record.source])).to.eql([
        ["https://example.com/registered", "registry"],
        ["https://example.com/schema", undefined]
      ]);

      session.close();
      await expect(get(session, "https://example.com/schema")).rejects.toThrow("closed");
    });

    test("a dialect built from a meta-schema only belongs to the session", async () => {
      const jsonSchema = jsonSchemaConfig({
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
      const session = new Hyperjump({ ...jsonSchema, registry });

      expect(await getDialect(session, uri)).to.eql({ uri, keywords: { $id: "https://json-schema.org/keyword/id" }, unknownKeywords: "annotation", formats: {}, assertFormats: false });
      expect(hasDialect(session, uri)).to.equal(true);
      expect(toId(uri) in definitionsOf(jsonSchema).dialects).to.equal(false);
      expect(hasDialect(new Hyperjump(jsonSchema), uri)).to.equal(false);
    });

    test("a session sees the dialects its media types were made with", async () => {
      /** @type Dialect */
      const dialect = { uri: "https://example.com/added-dialect", keywords: {}, unknownKeywords: "annotation" };
      const session = new Hyperjump(jsonSchemaConfig({ dialects: [dialect] }));

      expect(hasDialect(session, dialect.uri)).to.equal(true);
      expect(await getDialect(session, dialect.uri)).to.eql(dialect);
    });

    test("calls share an HTTP cache when the config has one", async () => {
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
        const cached = jsonSchemaConfig({ dialects: [v1Dialect], allowRetrieval: [origin], httpCache: new MemoryCacheStore() });
        const uncached = jsonSchemaConfig({ dialects: [v1Dialect], allowRetrieval: [origin] });

        expect(validatorFor(await compile(cached, `${origin}schema`))(42)).to.equal(false);
        expect(validatorFor(await compile(cached, `${origin}schema`))(42)).to.equal(false);
        expect(requests).to.equal(1);

        expect(validatorFor(await compile(uncached, `${origin}schema`))(42)).to.equal(false);
        expect(validatorFor(await compile(uncached, `${origin}schema`))(42)).to.equal(false);
        expect(requests).to.equal(3);
      } finally {
        server.close();
      }
    });

    test("the HTTP cache goes on top of the config's stack", async () => {
      let requests = 0;
      const stack = fetcher(() => {
        requests++;
        return new Response(JSON.stringify({ $schema: v1DialectUri, type: "string" }), {
          headers: { "content-type": "application/schema+json", "cache-control": "max-age=60" }
        });
      });
      const config = jsonSchemaConfig({ dialects: [v1Dialect], allowRetrieval: ["https://example.com/"], stack, httpCache: new MemoryCacheStore() });

      await compile(config, "https://example.com/schema");
      await compile(config, "https://example.com/schema");
      expect(requests).to.equal(1);
    });

    test("the HTTP cache keeps responses in the store it's given", async () => {
      /** @type Map<string, import("@hyperjump/browser").CachedEntry[]> */
      const entries = new Map();
      /** @type import("@hyperjump/browser").CacheStore */
      const store = {
        match: (url) => entries.get(url) ?? [],
        put: (entry) => {
          entries.set(entry.url, [entry]);
        },
        delete: (url) => {
          entries.delete(url);
        }
      };
      const stack = fetcher(() => new Response(JSON.stringify({ $schema: v1DialectUri, type: "string" }), {
        headers: { "content-type": "application/schema+json", "cache-control": "max-age=60" }
      }));
      const config = jsonSchemaConfig({ dialects: [v1Dialect], allowRetrieval: ["https://example.com/"], stack, httpCache: store });

      await compile(config, "https://example.com/schema");
      expect([...entries.keys()]).to.eql(["https://example.com/schema"]);
    });

    test("sessions retrieve through the config's stack, as it is", async () => {
      let requests = 0;
      const stack = fetcher(() => {
        requests++;
        return new Response(JSON.stringify({ $schema: v1DialectUri, type: "string" }), {
          headers: { "content-type": "application/schema+json", "cache-control": "max-age=60" }
        });
      });
      const uncached = jsonSchemaConfig({
        dialects: [v1Dialect],
        allowRetrieval: ["https://example.com/"],
        stack
      });

      expect(uncached.stack).to.equal(stack);
      expect(validatorFor(await compile(uncached, "https://example.com/schema"))(42)).to.equal(false);
      expect(validatorFor(await compile(uncached, "https://example.com/schema"))(42)).to.equal(false);
      expect(requests).to.equal(2);
    });

    test("JSON is read as a schema even when the config has browser's media types", async () => {
      const stack = fetcher(() => new Response(JSON.stringify({ $schema: v1DialectUri, type: "string" }), {
        headers: { "content-type": "application/json" }
      }));
      const withDefaults = jsonSchemaConfig({
        dialects: [v1Dialect],
        mediaTypes: [...[...defaultMediaTypes]],
        allowRetrieval: ["https://example.com/"],
        stack
      });

      expect((await getDocument(new Hyperjump(withDefaults), "https://example.com/schema")).type).to.equal("json-schema-document");
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

    test("a schema can be retrieved in any session whose config has the JSON Schema media types", async () => {
      const directory = await mkdtemp(join(tmpdir(), "json-schema-"));
      try {
        const path = join(directory, "schema.schema.json");
        await writeFile(path, JSON.stringify({ $schema: v1DialectUri }));

        const session = new Hyperjump({ mediaTypes: jsonSchema.mediaTypes, allowRetrieval: [pathToFileURL(join(directory, "/")).href] });
        expect(await get(session, pathToFileURL(path).toString())).to.include({ type: "json-schema" });
      } finally {
        await rm(directory, { recursive: true });
      }
    });

    test("a relative URI is resolved against the working directory", async () => {
      const directory = await mkdtemp(join(cwd(), ".json-schema-test-"));
      try {
        const path = join(directory, "schema.schema.json");
        await writeFile(path, JSON.stringify({ $schema: v1DialectUri, type: "string" }));

        const session = new Hyperjump(jsonSchemaConfig({ dialects: [v1Dialect] }));
        const document = await getDocument(session, relative(cwd(), path));
        expect(/** @type import("./schema/schema-ast.d.ts").JsonSchemaDocumentNode */ (/** @type unknown */ (document)).uri).to.equal(pathToFileURL(path).href);
      } finally {
        await rm(directory, { recursive: true });
      }
    });
  });

  describe("a compiled schema has one resource for a URI", () => {
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
      jsonSchema = jsonSchemaConfig({ dialects: [v1Dialect], registry: trusted });
    });

    test("a document can't change what a reference in another document finds", async () => {
      const options = {
        registry: other({
          sub: { $id: "https://example.com/trusted-sub" },
          common: { $id: "https://example.com/common", type: "number" }
        })
      };

      // What `other` embeds is only found by its own references, and it
      // doesn't have any to them
      const validate = validatorFor(await compile(jsonSchema, "https://example.com/other", options));
      expect(validate("a")).to.equal(true);
      expect(validate(42)).to.equal(false);
    });

    test("a document that reaches its own resource, and another document's with the same URI, isn't compiled", async () => {
      const options = {
        registry: new SchemaRegistry().with({
          $schema: v1DialectUri,
          $id: "https://example.com/other",
          allOf: [{ $ref: "https://example.com/common" }, { $ref: "https://example.com/trusted" }],
          $defs: {
            common: { $id: "https://example.com/common", type: "number" }
          }
        })
      };

      await expect(compile(jsonSchema, "https://example.com/other", options)).rejects.toMatchObject({
        name: "SchemaError",
        messages: [{
          ruleId: "duplicate-id",
          uri: "https://example.com/common",
          message: "'https://example.com/other' has a different schema resource identified as 'https://example.com/common'"
        }]
      });
    });

    /** @type (allOf: Json[]) => SchemaRegistry */
    const withItsOwnCopy = (allOf) => new SchemaRegistry().with({
      $schema: v1DialectUri,
      $id: "https://example.com/other",
      allOf,
      $defs: {
        sub: { $id: "https://example.com/trusted-sub", $ref: "https://example.com/common" },
        common: { $id: "https://example.com/common", type: "number" }
      }
    });

    test("an identical resource can't bring different resources with it", async () => {
      // Its copy of `trusted-sub` is identical, and is reached first, but
      // its reference finds a different `common` than the trusted one's
      const options = {
        registry: withItsOwnCopy([{ $ref: "https://example.com/trusted-sub" }, { $ref: "https://example.com/trusted" }])
      };

      await expect(compile(jsonSchema, "https://example.com/other", options)).rejects.toMatchObject({
        name: "SchemaError",
        messages: [{
          ruleId: "duplicate-id",
          uri: "https://example.com/common",
          message: "'https://example.com/other' has a different schema resource identified as 'https://example.com/common'"
        }]
      });
    });

    test("whichever document is reached first", async () => {
      const options = {
        registry: withItsOwnCopy([{ $ref: "https://example.com/trusted" }, { $ref: "https://example.com/trusted-sub" }])
      };

      await expect(compile(jsonSchema, "https://example.com/other", options)).rejects.toMatchObject({
        name: "SchemaError",
        messages: [{
          ruleId: "duplicate-id",
          uri: "https://example.com/common",
          message: "'https://example.com/other' has a different schema resource identified as 'https://example.com/common'"
        }]
      });
    });

    test("an identical resource can be in more than one document", async () => {
      const options = {
        registry: other({
          sub: { $id: "https://example.com/trusted-sub", $ref: "https://example.com/common" },
          common: { $id: "https://example.com/common", type: "string" }
        })
      };

      expect(validatorFor(await compile(jsonSchema, "https://example.com/other", options))(42)).to.equal(false);
      expect(validatorFor(await compile(jsonSchema, "https://example.com/trusted", options))(42)).to.equal(false);
    });

    test("an embedded resource and a document with the same URI are each compiled as they are", async () => {
      const options = {
        registry: new SchemaRegistry().with({
          $schema: v1DialectUri,
          $id: "https://example.com/other",
          $ref: "https://example.com/common",
          $defs: {
            common: { $id: "https://example.com/common", type: "number" }
          }
        })
      };

      expect(validatorFor(await compile(jsonSchema, "https://example.com/other", options))(42)).to.equal(true);
      expect(validatorFor(await compile(jsonSchema, "https://example.com/common", options))(42)).to.equal(false);
    });

    test("a reference to a schema that's a reference finds what that one finds, from its document", async () => {
      const draft07 = jsonSchemaConfig({ dialects: [v1Dialect, draft07Dialect] });
      const registry = new SchemaRegistry()
        .with({ $schema: v1DialectUri, $id: "https://example.com/main", $ref: "https://example.com/old#/definitions/alias" })
        .with({
          $schema: draft07Dialect.uri,
          $id: "https://example.com/old",
          definitions: {
            alias: { $ref: "https://example.com/embedded" },
            embedded: { $id: "https://example.com/embedded", type: "number" }
          }
        })
        .with({ $schema: v1DialectUri, $id: "https://example.com/embedded", type: "string" });

      const validate = validatorFor(await compile(draft07, "https://example.com/main", { registry }));
      expect([validate(42), validate("a")]).to.eql([true, false]);
    });

    test("schemas that are references that lead back to one already followed aren't compiled", async () => {
      const draft07 = jsonSchemaConfig({ dialects: [v1Dialect, draft07Dialect] });
      const registry = new SchemaRegistry()
        .with({ $schema: v1DialectUri, $id: "https://example.com/main", $ref: "https://example.com/a#/definitions/x" })
        .with({ $schema: draft07Dialect.uri, $id: "https://example.com/a", definitions: { x: { $ref: "https://example.com/b#/definitions/y" } } })
        .with({ $schema: draft07Dialect.uri, $id: "https://example.com/b", definitions: { y: { $ref: "https://example.com/a#/definitions/x" } } });

      const compiling = compile(draft07, "https://example.com/main", { registry });
      await expect(compiling).rejects.toThrow("Following references led back to 'https://example.com/a#/definitions/x'");
      await expect(compiling).rejects.toMatchObject({ cause: { code: "ERR_REFERENCE_CYCLE" } });
    });

    test("documents with different resources for a URI can be browsed in one session", async () => {
      const session = new Hyperjump({ ...jsonSchema, registry: trusted.with({
        $schema: v1DialectUri,
        $id: "https://example.com/other",
        $defs: {
          common: { $id: "https://example.com/common", type: "number" }
        }
      }) });

      const embedded = await get(session, "https://example.com/other#/$defs/common/type");
      const document = await get(session, "https://example.com/common#/type");
      expect([jsonValue(/** @type any */ (embedded)), jsonValue(/** @type any */ (document))]).to.eql(["number", "string"]);
    });
  });

  describe("annotations", () => {
    const annotated = new SchemaRegistry().with({
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

    beforeEach(() => {
      jsonSchema = jsonSchemaConfig({ dialects: [v1Dialect], registry: annotated });
    });

    test("annotation by name in the v1 dialect", async () => {
      const { node } = await annotate(jsonSchema, "https://example.com/annotated", { foo: 1, bar: 2 });

      expect(annotation(jsonSchema, node, "title")).to.eql(["root"]);
      expect(annotation(jsonSchema, jsonPointerGet("/foo", /** @type any */ (node)), "title")).to.eql(["foo", "also foo"]);
      expect(annotation(jsonSchema, jsonPointerGet("/bar", /** @type any */ (node)), "title")).to.eql([]);
    });

    test("annotation by keyword URI", async () => {
      const { node } = await annotate(jsonSchema, "https://example.com/annotated", {});

      expect(annotation(jsonSchema, node, "https://json-schema.org/keyword/title")).to.eql(["root"]);
    });

    test("annotation by unknown keyword name", async () => {
      const { node } = await annotate(jsonSchema, "https://example.com/annotated", {});

      expect(annotation(jsonSchema, node, "x-foo")).to.eql(["bar"]);
    });

    test("annotation by unknown keyword URI", async () => {
      const { node } = await annotate(jsonSchema, "https://example.com/annotated", {});

      expect(annotation(jsonSchema, node, "https://json-schema.org/keyword/unknown#x-foo")).to.eql(["bar"]);
    });

    test("annotation by keyword URI doesn't need the dialect", async () => {
      const { node } = await annotate(jsonSchema, "https://example.com/annotated", {});

      expect(annotation(jsonSchema, node, "https://json-schema.org/keyword/title", "https://example.com/dialect")).to.eql(["root"]);
    });

    test("annotation by name with property names", async () => {
      const { node } = await annotate(jsonSchema, "https://example.com/annotated", { foo: 1 });
      const nameNode = /** @type any */ (node).children[0].children[0];

      expect(annotation(jsonSchema, nameNode, "title")).to.eql(["name"]);
    });

    test("annotation by name in another dialect", async () => {
      const other = jsonSchemaConfig({
        dialects: [v1Dialect, { uri: "https://example.com/dialect", keywords: { label: "https://json-schema.org/keyword/title" }, unknownKeywords: "error" }],
        registry: annotated
      });
      const { node } = await annotate(other, "https://example.com/annotated", {});

      expect(annotation(other, node, "label", "https://example.com/dialect")).to.eql(["root"]);
      expect(annotation(other, node, "title", "https://example.com/dialect")).to.eql([]);
    });

    test("annotation by name in a dialect the media types weren't made with", async () => {
      const { node } = await annotate(jsonSchema, "https://example.com/annotated", {});

      expect(() => annotation(jsonSchema, node, "title", "https://example.com/dialect")).to.throw("isn't one the JSON Schema media types were made with");
    });
  });

  describe("fragments", () => {
    test("an anchor", async () => {
      const registry = new SchemaRegistry().with({
        $schema: v1DialectUri,
        $id: "https://example.com/anchor",
        $ref: "#foo",
        $defs: { foo: { $anchor: "foo", type: "string" } }
      });
      expect(validatorFor(await compile(jsonSchema, "https://example.com/anchor", { registry }))(42)).to.equal(false);
    });

    test("an anchor that isn't in the document", async () => {
      const registry = new SchemaRegistry().with({ $schema: v1DialectUri, $id: "https://example.com/no-anchor", $ref: "#foo" });
      const error = await compile(jsonSchema, "https://example.com/no-anchor", { registry })
        .catch((/** @type unknown */ error) => error);
      expect(error).toMatchObject({
        cause: { code: "ERR_ANCHOR_NOT_FOUND", anchor: "foo" },
        url: "https://example.com/no-anchor",
        message: "There's no 'foo' anchor in 'https://example.com/no-anchor'"
      });
    });

    test("a percent-encoded JSON Pointer", async () => {
      const registry = new SchemaRegistry().with({
        $schema: v1DialectUri,
        $id: "https://example.com/pointer",
        $ref: "#%2F$defs%2Ffoo",
        $defs: { foo: { type: "string" } }
      });
      expect(validatorFor(await compile(jsonSchema, "https://example.com/pointer", { registry }))(42)).to.equal(false);
    });
  });

  describe("built-in keywords", () => {
    test.each([
      "https://json-schema.org/keyword/schema",
      "https://json-schema.org/keyword/unknown"
    ])("'%s' is added by default", (uri) => {
      expect(definitionsOf(jsonSchema).keywords[uri]).to.include({ uri, shape: "data" });
    });
  });
});
