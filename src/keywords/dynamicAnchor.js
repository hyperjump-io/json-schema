import { anchorName } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `$dynamicAnchor` since 2020-12. It identifies a schema for `$dynamicRef`. It
 * also works like `$anchor`.
 *
 * @type Keyword<string, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/dynamicAnchor",
  shape: "data",
  check: anchorName,
  resolve(valueNode, context) {
    if (valueNode.type === "json" && valueNode.jsonType === "string") {
      context.addAnchor(valueNode.value);
      context.addDynamicAnchor(valueNode.value);
    }
  }
};
