import keywordSchema from "./dynamicAnchor.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `$dynamicAnchor` since 2020-12. It identifies a schema for `$dynamicRef`. It
 * also works like `$anchor`.
 *
 * @type Keyword
 */
export default {
  uri: "https://json-schema.org/keyword/dynamicAnchor",
  shape: "data",
  schema: keywordSchema,
  resolve(valueNode, context) {
    if (valueNode.type === "json" && valueNode.jsonType === "string") {
      context.addAnchor(valueNode.value);
      context.addDynamicAnchor(valueNode.value);
    }
  }
};
