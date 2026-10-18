import { describe, test, beforeEach, expect } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { SchemaRegistry } from "../schema-registry.js";
import idKeyword from "./id.js";
import vocabularyKeyword, { addVocabulary } from "./vocabulary.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 */

const metaDialectUri = "https://example.com/meta-dialect";
const otherMetaDialectUri = "https://example.com/other-meta-dialect";
const fooVocabularyUri = "https://example.com/vocab/foo";
const barVocabularyUri = "https://example.com/vocab/bar";

/** @type (jsonSchema: JsonSchema) => JsonSchema */
const addMetaDialects = (jsonSchema) => {
  jsonSchema.addKeyword(idKeyword);
  jsonSchema.addKeyword(vocabularyKeyword);
  for (const uri of [metaDialectUri, otherMetaDialectUri]) {
    jsonSchema.addDialect({
      uri: uri,
      keywords: { $id: idKeyword.uri, $vocabulary: vocabularyKeyword.uri },
      unknownKeywords: "annotation"
    });
  }

  return jsonSchema;
};

/** @type (dialectUri: string, $schema: string, vocabularies: Record<string, boolean>) => Json */
const metaSchema = (dialectUri, $schema, vocabularies) => ({ $schema, $id: dialectUri, $vocabulary: vocabularies });

describe("addVocabulary", () => {
  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = addMetaDialects(new JsonSchema());
  });

  /** @type (jsonSchema: JsonSchema, schemas: Json[], dialectUri: string) => Promise<unknown> */
  const getDialect = async (jsonSchema, schemas, dialectUri) => {
    const registry = new SchemaRegistry();
    for (const schema of schemas) {
      registry.add(schema);
    }

    return jsonSchema.session({ registries: [registry] }).getDialect(dialectUri);
  };

  test("vocabularies added separately are both supported", async () => {
    addVocabulary(jsonSchema, fooVocabularyUri, { foo: "https://example.com/keyword/foo" });
    addVocabulary(jsonSchema, barVocabularyUri, { bar: "https://example.com/keyword/bar" });

    const dialectUri = "https://example.com/dialect";
    const dialect = await getDialect(jsonSchema, [
      metaSchema(dialectUri, metaDialectUri, { [fooVocabularyUri]: true, [barVocabularyUri]: true })
    ], dialectUri);

    expect(dialect).to.eql({
      uri: dialectUri,
      keywords: { foo: "https://example.com/keyword/foo", bar: "https://example.com/keyword/bar" },
      unknownKeywords: "annotation"
    });
  });

  test("a vocabulary works in every dialect that uses the keyword", async () => {
    addVocabulary(jsonSchema, fooVocabularyUri, { foo: "https://example.com/keyword/foo" });

    const aUri = "https://example.com/a-dialect";
    const bUri = "https://example.com/b-dialect";
    const schemas = [
      metaSchema(aUri, metaDialectUri, { [fooVocabularyUri]: true }),
      metaSchema(bUri, otherMetaDialectUri, { [fooVocabularyUri]: true })
    ];

    expect(await getDialect(jsonSchema, schemas, aUri)).to.include({ uri: aUri });
    expect(await getDialect(jsonSchema, schemas, bUri)).to.include({ uri: bUri });
  });

  test("a vocabulary is only supported by the JsonSchema it's added to", () => {
    const other = addMetaDialects(new JsonSchema());
    addVocabulary(jsonSchema, fooVocabularyUri, { foo: "https://example.com/keyword/foo" });

    const registry = new SchemaRegistry();
    jsonSchema.addRegistry(registry);
    other.addRegistry(registry);

    expect(() => registry.add(metaSchema("https://example.com/dialect", metaDialectUri, { [fooVocabularyUri]: true }))).to.throw(fooVocabularyUri);
    expect(vocabularyKeyword.vocabularies).to.eql({});
  });

  test("the keyword is added if it hasn't been", () => {
    const fresh = new JsonSchema();
    addVocabulary(fresh, fooVocabularyUri, {});

    expect(fresh.hasKeyword(vocabularyKeyword.uri)).to.equal(true);
  });

  test("x- keywords are reserved", () => {
    expect(() => addVocabulary(jsonSchema, fooVocabularyUri, { "x-foo": "https://example.com/keyword/foo" })).to.throw("reserved");
  });

  test("a $vocabulary keyword that doesn't support vocabularies", () => {
    jsonSchema.addKeyword({ ...idKeyword, uri: vocabularyKeyword.uri });

    expect(() => addVocabulary(jsonSchema, fooVocabularyUri, {})).to.throw("doesn't support vocabularies");
  });
});
