import keywordSchema from "./vocabulary.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { JsonSchema } from "../json-schema.d.ts"
 */

/**
 * The `$vocabulary` keyword with the vocabularies it knows: vocabulary URIs
 * mapped to their keywords, as keyword names mapped to keyword URIs
 *
 * @typedef {Keyword & { vocabularies: Readonly<Record<string, Readonly<Record<string, string>>>> }} VocabularyKeyword
 */

const uri = "https://json-schema.org/keyword/vocabulary";

/**
 * The definition never changes. Adding a vocabulary replaces it with one
 * that knows more vocabularies, so it's still stateless and only the
 * JsonSchema it's added to sees the new vocabulary.
 *
 * @type (vocabularies: VocabularyKeyword["vocabularies"]) => VocabularyKeyword
 */
const vocabularyKeyword = (vocabularies) => ({
  uri: uri,
  shape: "data",
  schema: keywordSchema,
  vocabularies: vocabularies,
  resolve(valueNode, context) {
    if (valueNode.type !== "json" || valueNode.jsonType !== "object") {
      return;
    }

    /** @type Record<string, string> */
    const keywords = {};
    let isSupported = true;
    for (const property of valueNode.children) {
      const [nameNode, requiredNode] = property.children;
      if (requiredNode.type !== "json" || requiredNode.jsonType !== "boolean") {
        continue;
      }

      const vocabulary = vocabularies[nameNode.value];
      if (vocabulary) {
        Object.assign(keywords, vocabulary);
      } else if (requiredNode.value) {
        context.message(`The '${nameNode.value}' vocabulary isn't supported. Use the 'addVocabulary' function to add support for it.`, nameNode);
        isSupported = false;
      }
    }

    if (isSupported) {
      context.defineDialect({ keywords, unknownKeywords: "annotation" });
    }
  }
});

/**
 * `$vocabulary` (2019-09, 2020-12). It makes a meta-schema define the dialect
 * it identifies, with the keywords of the vocabularies it lists. A required
 * vocabulary (`true`) that the keyword doesn't know is a problem with the
 * meta-schema. An optional one (`false`) is skipped. Entries that aren't
 * booleans are ignored.
 *
 * Every dialect that has `$vocabulary` uses this keyword, so a vocabulary
 * added with {@link addVocabulary} works in all of them. It doesn't know any
 * vocabularies until they're added.
 */
export default vocabularyKeyword({});

/**
 * Add or replace a vocabulary that `$vocabulary` can use, in every dialect
 * of the {@link JsonSchema} that uses the `$vocabulary` keyword. The keyword
 * is added if it hasn't been. Meta-schemas that were already resolved aren't
 * affected.
 *
 * @param {JsonSchema} jsonSchema
 * @param {string} vocabularyUri
 * @param {Record<string, string>} keywords - Keyword names mapped to keyword
 *   URIs
 * @throws Error if a keyword name starts with `x-`, or the `$vocabulary`
 * keyword was replaced with one that doesn't support vocabularies
 */
export const addVocabulary = (jsonSchema, vocabularyUri, keywords) => {
  for (const name in keywords) {
    if (name.startsWith("x-")) {
      throw Error(`'${name}' can't be a keyword. Keywords starting with 'x-' are reserved for schema authors and must never assert.`);
    }
  }

  /** @type VocabularyKeyword["vocabularies"] */
  let vocabularies = {};
  if (jsonSchema.hasKeyword(uri)) {
    const keyword = jsonSchema.getKeyword(uri);
    if (!("vocabularies" in keyword)) {
      throw Error(`The '${uri}' keyword was replaced with one that doesn't support vocabularies`);
    }
    vocabularies = /** @type VocabularyKeyword */ (keyword).vocabularies;
  }

  jsonSchema.addKeyword(vocabularyKeyword({ ...vocabularies, [vocabularyUri]: { ...keywords } }));
};
