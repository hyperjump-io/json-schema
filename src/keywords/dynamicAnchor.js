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
  valueSchema: new URL("./dynamicAnchor.schema.json", import.meta.url).href,
  resolve(valueNode, context) {
    if (valueNode.type === "json" && valueNode.jsonType === "string") {
      context.addAnchor(valueNode.value);
      context.addDynamicAnchor(valueNode.value);
    }
  }
};
