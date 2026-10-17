import { describe, test, beforeEach, expect } from "vitest";
import { JsonSchema } from "./json-schema.js";

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
    const dialect = { uri: "https://example.com/dialect", keywords: { $id: "https://json-schema.org/keyword/id" } };

    test("addDialect", async () => {
      jsonSchema.addDialect(dialect);

      expect(jsonSchema.hasDialect(dialect.uri)).to.equal(true);
      expect(await jsonSchema.getDialect(dialect.uri)).to.eql(dialect);
    });

    test("an empty fragment identifies the same dialect", async () => {
      jsonSchema.addDialect({ ...dialect, uri: `${dialect.uri}#` });

      expect(jsonSchema.hasDialect(dialect.uri)).to.equal(true);
      expect(await jsonSchema.getDialect(dialect.uri)).to.eql(dialect);
    });

    test("a dialect can't be replaced", () => {
      jsonSchema.addDialect(dialect);

      expect(() => jsonSchema.addDialect(dialect)).to.throw("already defined");
      expect(() => jsonSchema.addDialectFromVocabularies(dialect.uri, {})).to.throw("already defined");
    });

    test("a dialect can be replaced after it's removed", async () => {
      jsonSchema.addDialect(dialect);
      jsonSchema.removeDialect(dialect.uri);

      expect(jsonSchema.hasDialect(dialect.uri)).to.equal(false);

      const replacement = { ...dialect, keywords: {} };
      jsonSchema.addDialect(replacement);
      expect(await jsonSchema.getDialect(dialect.uri)).to.eql(replacement);
    });

    test("addDialectFromVocabularies", async () => {
      const added = jsonSchema.addDialectFromVocabularies(dialect.uri, {
        "https://example.com/vocab/core": true,
        "https://example.com/vocab/optional": false
      });

      expect(added).to.eql(dialect);
      expect(await jsonSchema.getDialect(dialect.uri)).to.eql(dialect);
    });

    test("addDialectFromVocabularies with a required vocabulary that isn't supported", () => {
      expect(() => jsonSchema.addDialectFromVocabularies(dialect.uri, {
        "https://example.com/vocab/required": true
      })).to.throw("https://example.com/vocab/required");
      expect(jsonSchema.hasDialect(dialect.uri)).to.equal(false);
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
      expect(jsonSchema.getKeyword(uri)).to.eql({ uri, shape: "data" });
    });
  });
});
