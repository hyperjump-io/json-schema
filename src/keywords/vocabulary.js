import keywordSchema from "./vocabulary.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `$vocabulary` in 2019-09 and 2020-12. It makes a meta-schema define the
 * dialect it identifies, with the keywords of the vocabularies it lists.
 * Entries that aren't booleans are ignored.
 *
 * @type Keyword
 */
export default {
  uri: "https://json-schema.org/keyword/vocabulary",
  shape: "data",
  schema: keywordSchema,
  resolve(valueNode, context) {
    if (valueNode.type !== "json" || valueNode.jsonType !== "object") {
      return;
    }

    /** @type Record<string, boolean> */
    const vocabularies = {};
    for (const property of valueNode.children) {
      const [nameNode, vocabularyNode] = property.children;
      if (vocabularyNode.type === "json" && vocabularyNode.jsonType === "boolean") {
        vocabularies[nameNode.value] = vocabularyNode.value;
      }
    }

    context.defineDialect(vocabularies);
  }
};
