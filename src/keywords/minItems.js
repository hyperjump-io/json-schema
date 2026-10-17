/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `minItems`
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/minItems",
  shape: "data",
  valueSchema: new URL("./minItems.schema.json", import.meta.url).href,
  evaluate: (minItems, { instance }) => (node) => {
    return instance.typeOf(node) !== "array" || instance.length(node) >= minItems;
  }
};
