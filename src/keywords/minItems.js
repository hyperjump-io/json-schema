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
  evaluate: (minItems, { instance }) => (node) => {
    return instance.typeOf(node) !== "array" || instance.length(node) >= minItems;
  }
};
