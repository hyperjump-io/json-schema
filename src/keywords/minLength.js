import { codePointLength } from "./utilities.js";
import keywordSchema from "./minLength.schema.json" with { type: "json" };

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
  schema: keywordSchema,
  evaluate: (minLength, { instance }) => (node) => {
    return instance.typeOf(node) !== "string" || codePointLength(/** @type string */ (instance.value(node))) >= minLength;
  }
};
