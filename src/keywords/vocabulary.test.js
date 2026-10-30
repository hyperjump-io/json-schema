import { describe, test, expect } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import idKeyword from "./id.js";
import vocabularyKeyword from "./vocabulary.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { DialectConfig, VocabularyConfig } from "../dialect.d.ts"
 */

const metaDialectUri = "https://example.com/meta-dialect";
const otherMetaDialectUri = "https://example.com/other-meta-dialect";
const fooVocabularyUri = "https://example.com/vocab/foo";
const barVocabularyUri = "https://example.com/vocab/bar";

const fooKeyword = { uri: "https://example.com/keyword/foo", shape: /** @type const */ ("data") };
const barKeyword = { uri: "https://example.com/keyword/bar", shape: /** @type const */ ("data") };

describe("vocabularies", () => {
  /** @type (vocabularies?: Record<string, VocabularyConfig>, dialectVocabularies?: Record<string, VocabularyConfig>) => JsonSchema */
  const withVocabularies = (vocabularies, dialectVocabularies) => new JsonSchema({
    dialects: [metaDialect(metaDialectUri, dialectVocabularies), metaDialect(otherMetaDialectUri)],
    vocabularies
  });

  /** @type (jsonSchema: JsonSchema, schemas: Json[], dialectUri: string) => Promise<unknown> */
  const getDialect = async (jsonSchema, schemas, dialectUri) => {
    const registry = new SchemaRegistry(schemas.map((schema) => ({ schema })));

    return jsonSchema.session({ registry }).getDialect(dialectUri);
  };

  test("every vocabulary in the config is supported", async () => {
    const jsonSchema = withVocabularies({
      [fooVocabularyUri]: { keywords: { foo: fooKeyword } },
      [barVocabularyUri]: { keywords: { bar: barKeyword } }
    });

    const dialectUri = "https://example.com/dialect";
    const dialect = await getDialect(jsonSchema, [
      metaSchema(dialectUri, metaDialectUri, { [fooVocabularyUri]: true, [barVocabularyUri]: true })
    ], dialectUri);

    expect(dialect).to.eql({
      uri: dialectUri,
      keywords: { foo: "https://example.com/keyword/foo", bar: "https://example.com/keyword/bar" },
      unknownKeywords: "annotation",
      formats: {},
      assertFormats: false
    });
  });

  test("vocabularies add formats, and any of them can make formats assert", async () => {
    const jsonSchema = withVocabularies({
      [fooVocabularyUri]: { keywords: {}, formats: { foo: "https://example.com/format/foo" } },
      [barVocabularyUri]: { keywords: {}, formats: { bar: "https://example.com/format/bar" }, assertFormats: true }
    });

    const dialectUri = "https://example.com/dialect";
    const dialect = await getDialect(jsonSchema, [
      metaSchema(dialectUri, metaDialectUri, { [fooVocabularyUri]: true, [barVocabularyUri]: false })
    ], dialectUri);

    expect(dialect).to.include({ assertFormats: true });
    expect(dialect).to.have.deep.property("formats", { foo: "https://example.com/format/foo", bar: "https://example.com/format/bar" });
  });

  test("a vocabulary works in every dialect that uses the keyword", async () => {
    const jsonSchema = withVocabularies({ [fooVocabularyUri]: { keywords: { foo: fooKeyword } } });

    const aUri = "https://example.com/a-dialect";
    const bUri = "https://example.com/b-dialect";
    const schemas = [
      metaSchema(aUri, metaDialectUri, { [fooVocabularyUri]: true }),
      metaSchema(bUri, otherMetaDialectUri, { [fooVocabularyUri]: true })
    ];

    expect(await getDialect(jsonSchema, schemas, aUri)).to.include({ uri: aUri });
    expect(await getDialect(jsonSchema, schemas, bUri)).to.include({ uri: bUri });
  });

  test("a dialect's vocabularies work in every dialect that uses the keyword", async () => {
    const jsonSchema = withVocabularies(undefined, { [fooVocabularyUri]: { keywords: { foo: fooKeyword } } });

    const dialectUri = "https://example.com/dialect";
    const schemas = [metaSchema(dialectUri, otherMetaDialectUri, { [fooVocabularyUri]: true })];

    expect(await getDialect(jsonSchema, schemas, dialectUri)).to.include({ uri: dialectUri });
    expect(jsonSchema.getKeyword(fooKeyword.uri)).to.equal(fooKeyword);
  });

  test("one in the config replaces a dialect's", () => {
    const jsonSchema = withVocabularies(
      { [fooVocabularyUri]: { keywords: { bar: barKeyword } } },
      { [fooVocabularyUri]: { keywords: { foo: fooKeyword } } }
    );

    expect(jsonSchema.getVocabulary(fooVocabularyUri)).to.eql({ keywords: { bar: barKeyword.uri } });
  });

  test("a vocabulary is only supported by the JsonSchema it's in the config of", async () => {
    const jsonSchema = withVocabularies({ [fooVocabularyUri]: { keywords: { foo: fooKeyword } } });
    const other = withVocabularies();

    const schemas = [metaSchema("https://example.com/dialect", metaDialectUri, { [fooVocabularyUri]: true })];

    await expect(getDialect(jsonSchema, schemas, "https://example.com/dialect")).resolves.toBeDefined();
    await expect(getDialect(other, schemas, "https://example.com/dialect")).rejects.toThrow();
  });

  test("x- keywords are reserved", () => {
    expect(() => withVocabularies({ [fooVocabularyUri]: { keywords: { "x-foo": fooKeyword } } })).to.throw("reserved");
  });

  test("a keyword it names by URI has to be defined", () => {
    expect(() => withVocabularies({ [fooVocabularyUri]: { keywords: { foo: fooKeyword.uri } } })).to.throw(fooKeyword.uri);
  });
});

/** @type (uri: string, vocabularies?: Record<string, VocabularyConfig>) => DialectConfig */
const metaDialect = (uri, vocabularies) => ({
  uri: uri,
  keywords: { $id: idKeyword, $vocabulary: vocabularyKeyword },
  unknownKeywords: "annotation",
  vocabularies
});

/** @type (dialectUri: string, $schema: string, vocabularies: Record<string, boolean>) => Json */
const metaSchema = (dialectUri, $schema, vocabularies) => ({ $schema, $id: dialectUri, $vocabulary: vocabularies });
