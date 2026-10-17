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
  evaluate: (maxItems, { instance }) => (node) => {
    return instance.typeOf(node) !== "array" || instance.length(node) <= maxItems;
  }
};
