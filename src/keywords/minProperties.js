import { nonNegativeInteger } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `minProperties`
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/minProperties",
  shape: "data",
  check: nonNegativeInteger,
  evaluate: (minProperties, { instance }) => (node) => {
    return instance.typeOf(node) !== "object" || instance.length(node) >= minProperties;
  }
};
