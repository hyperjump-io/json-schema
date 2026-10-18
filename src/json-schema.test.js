import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeEach, expect } from "vitest";
import { Session } from "@hyperjump/browser";
import { JsonSchema } from "./json-schema.js";
import { v1DialectUri } from "./v1/index.js";
import unknownKeyword from "./keywords/unknown.js";

/** A value schema that allows any value, for keywords defined in tests */
const anyValue = unknownKeyword.valueSchema;

/**
 * @import { Dialect } from "./dialect.d.ts"
 */

describe("JsonSchema", () => {
  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = new JsonSchema();
    jsonSchema.addVocabulary({
      uri: "https://example.com/vocab/core",
      keywords: { $id: "https://json-schema.org/keyword/id" }
    });
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
      expect(() => jsonSchema.addDialectFromVocabularies(dialect.uri, {})).to.throw("already defined");
    });

    test("a dialect can be replaced after it's removed", () => {
      jsonSchema.addDialect(dialect);
      jsonSchema.removeDialect(dialect.uri);

      expect(jsonSchema.hasDialect(dialect.uri)).to.equal(false);

      const replacement = { ...dialect, keywords: {} };
      jsonSchema.addDialect(replacement);
      expect(jsonSchema.getDialect(dialect.uri)).to.eql(replacement);
    });

    test("addDialectFromVocabularies", () => {
      const added = jsonSchema.addDialectFromVocabularies(dialect.uri, {
        "https://example.com/vocab/core": true,
        "https://example.com/vocab/optional": false
      });

      expect(added).to.eql({ ...dialect, unknownKeywords: "annotation" });
      expect(jsonSchema.getDialect(dialect.uri)).to.eql(added);
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

    test("addDialectFromVocabularies with a required vocabulary that isn't supported", () => {
      expect(() => jsonSchema.addDialectFromVocabularies(dialect.uri, {
        "https://example.com/vocab/required": true
      })).to.throw("https://example.com/vocab/required");
      expect(jsonSchema.hasDialect(dialect.uri)).to.equal(false);
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

    test("addVocabulary", () => {
      expect(() => jsonSchema.addVocabulary({ uri: "https://example.com/vocab/x", keywords })).to.throw("reserved");
    });

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
    test("a dialect built in a session only belongs to that session", async () => {
      const session = jsonSchema.session();
      const dialect = session.addDialectFromVocabularies("https://example.com/session-dialect", {
        "https://example.com/vocab/core": true
      });

      expect(await session.getDialect(dialect.uri)).to.equal(dialect);
      expect(session.hasDialect(dialect.uri)).to.equal(true);
      expect(jsonSchema.hasDialect(dialect.uri)).to.equal(false);
      expect(jsonSchema.session().hasDialect(dialect.uri)).to.equal(false);
    });

    test("a session sees dialects added to its JsonSchema", async () => {
      const dialect = jsonSchema.addDialectFromVocabularies("https://example.com/added-dialect", {
        "https://example.com/vocab/core": true
      });
      const session = jsonSchema.session();

      expect(session.hasDialect(dialect.uri)).to.equal(true);
      expect(await session.getDialect(dialect.uri)).to.eql(dialect);
      expect(() => session.addDialectFromVocabularies(dialect.uri, {})).to.throw("already defined");
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
      const valueSchema = jsonSchema.getKeyword("https://json-schema.org/keyword/schema").valueSchema;

      await expect(new Session(jsonSchema).get(valueSchema)).rejects.toMatchObject({
        cause: { message: expect.stringContaining("JsonSchemaSession") }
      });
    });
  });

  describe("keywords", () => {
    test("addKeyword", () => {
      const keyword = { uri: "https://example.com/keyword/foo", shape: /** @type const */ ("data"), valueSchema: anyValue };
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
