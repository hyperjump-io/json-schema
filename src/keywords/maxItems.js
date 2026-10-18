import keywordSchema from "./maxItems.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `maxItems`
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/maxItems",
  shape: "data",
  schema: keywordSchema,
  evaluate: (maxItems, { instance }) => (node) => {
    return instance.typeOf(node) !== "array" || instance.length(node) <= maxItems;
  }
};
