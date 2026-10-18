import keywordSchema from "./maximum.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `maximum`
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/maximum",
  shape: "data",
  schema: keywordSchema,
  evaluate: (maximum, { instance }) => (node) => {
    return instance.typeOf(node) !== "number" || /** @type number */ (instance.value(node)) <= maximum;
  }
};
