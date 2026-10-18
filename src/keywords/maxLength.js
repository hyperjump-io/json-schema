import { codePointLength } from "./utilities.js";
import keywordSchema from "./maxLength.schema.json" with { type: "json" };

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
  schema: keywordSchema,
  evaluate: (maxLength, { instance }) => (node) => {
    return instance.typeOf(node) !== "string" || codePointLength(/** @type string */ (instance.value(node))) <= maxLength;
  }
};
