import { jsInstance } from "../instance.js";
import { instanceEqual } from "./utilities.js";
import keywordSchema from "./const.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `const`
 *
 * @type Keyword
 */
export default {
  uri: "https://json-schema.org/keyword/const",
  shape: "data",
  schema: keywordSchema,
  evaluate: (value, { instance }) => (node) => instanceEqual(instance, node, jsInstance, value, true)
};
