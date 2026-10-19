import { nonNegativeInteger } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `maxProperties`
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/maxProperties",
  shape: "data",
  check: nonNegativeInteger,
  evaluate: (maxProperties, { instance }) => (node) => {
    return instance.typeOf(node) !== "object" || instance.length(node) <= maxProperties;
  }
};
