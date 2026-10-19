import { codePointLength } from "./utilities.js";
import { nonNegativeInteger } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `maxLength`. Length is in code points.
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/maxLength",
  shape: "data",
  check: nonNegativeInteger,
  evaluate: (maxLength, { instance }) => (node) => {
    return instance.typeOf(node) !== "string" || codePointLength(/** @type string */ (instance.value(node))) <= maxLength;
  }
};
