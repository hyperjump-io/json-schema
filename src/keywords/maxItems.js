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
  valueSchema: new URL("./maxItems.schema.json", import.meta.url).href,
  evaluate: (maxItems, { instance }) => (node) => {
    return instance.typeOf(node) !== "array" || instance.length(node) <= maxItems;
  }
};
