import { codePointLength } from "./utilities.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `minLength`. Length is in code points.
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/minLength",
  shape: "data",
  evaluate: (minLength, { instance }) => (node) => {
    return instance.typeOf(node) !== "string" || codePointLength(/** @type string */ (instance.value(node))) >= minLength;
  }
};
