import keywordSchema from "./minProperties.schema.json" with { type: "json" };

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
  schema: keywordSchema,
  evaluate: (minProperties, { instance }) => (node) => {
    return instance.typeOf(node) !== "object" || instance.length(node) >= minProperties;
  }
};
