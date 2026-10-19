import { isIri } from "@hyperjump/json-schema-formats";
import { boolean } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { JsonSchema } from "../json-schema.d.ts"
 */

/**
 * What a vocabulary adds to a dialect. `keywords` and `formats` are names
 * mapped to URIs, as in a dialect. `assertFormats` makes `format` validate by
 * default if any listed vocabulary says so (2020-12's format-assertion).
 *
 * @typedef {{
 *   keywords: Readonly<Record<string, string>>;
 *   formats?: Readonly<Record<string, string>>;
 *   assertFormats?: boolean;
 * }} Vocabulary
 */

/**
 * The `$vocabulary` keyword with the vocabularies it knows, by URI
 *
 * @typedef {Keyword & { vocabularies: Readonly<Record<string, Vocabulary>> }} VocabularyKeyword
 */

const uri = "https://json-schema.org/keyword/vocabulary";

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
 * @param {Vocabulary} vocabulary
 * @throws Error if a keyword name starts with `x-`, or the `$vocabulary`
 * keyword was replaced with one that doesn't support vocabularies
 */
export const addVocabulary = (jsonSchema, vocabularyUri, { keywords, formats, assertFormats }) => {
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

  /** @type Vocabulary */
  const vocabulary = { keywords: { ...keywords } };
  if (formats !== undefined) {
    vocabulary.formats = { ...formats };
  }
  if (assertFormats !== undefined) {
    vocabulary.assertFormats = assertFormats;
  }

  jsonSchema.addKeyword(vocabularyKeyword({ ...vocabularies, [vocabularyUri]: vocabulary }));
};

/**
 * The definition never changes. Adding a vocabulary replaces it with one
 * that knows more vocabularies, so it's still stateless and only the
 * JsonSchema it's added to sees the new vocabulary.
 *
 * It's a function declaration, not an arrow function, so it's hoisted for
 * the default export.
 *
 * @type (vocabularies: VocabularyKeyword["vocabularies"]) => VocabularyKeyword
 */
function vocabularyKeyword(vocabularies) {
  return {
    uri: uri,
    shape: "data",
    check(valueNode, context) {
      if (valueNode.jsonType !== "object") {
        context.message("Expected an object");
        return;
      }

      for (const property of valueNode.children) {
        const [nameNode, requiredNode] = property.children;
        if (!isIri(nameNode.value)) {
          context.message("Expected a URI", nameNode);
        }
        boolean(requiredNode, context);
      }
    },
    vocabularies: vocabularies,
    resolve(valueNode, context) {
      if (valueNode.type !== "json" || valueNode.jsonType !== "object") {
        return;
      }

      /** @type Record<string, string> */
      const keywords = {};

      /** @type Record<string, string> */
      const formats = {};
      let assertFormats = false;
      let isSupported = true;
      for (const property of valueNode.children) {
        const [nameNode, requiredNode] = property.children;
        if (requiredNode.type !== "json" || requiredNode.jsonType !== "boolean") {
          continue;
        }

        const vocabulary = vocabularies[nameNode.value];
        if (vocabulary) {
          Object.assign(keywords, vocabulary.keywords);
          Object.assign(formats, vocabulary.formats);
          assertFormats ||= vocabulary.assertFormats ?? false;
        } else if (requiredNode.value) {
          context.message(`The '${nameNode.value}' vocabulary isn't supported. Use the 'addVocabulary' function to add support for it.`, nameNode);
          isSupported = false;
        }
      }

      if (isSupported) {
        context.defineDialect({ keywords, unknownKeywords: "annotation", formats, assertFormats });
      }
    }
  };
}
