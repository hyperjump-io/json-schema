import { nonNegativeInteger } from "./checks.js";

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
  default: 0,
  check: nonNegativeInteger,
  evaluate: (minItems, { instance }) => (node) => {
    return instance.typeOf(node) !== "array" || instance.length(node) >= minItems;
  }
};
