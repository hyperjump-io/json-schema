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
  valueSchema: new URL("./minLength.schema.json", import.meta.url).href,
  evaluate: (minLength, { instance }) => (node) => {
    return instance.typeOf(node) !== "string" || codePointLength(/** @type string */ (instance.value(node))) >= minLength;
  }
};
