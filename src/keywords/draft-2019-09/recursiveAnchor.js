/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `$recursiveAnchor` in 2019-09. `true` works like a dynamic anchor with an
 * empty name.
 *
 * @type Keyword
 */
export default {
  uri: "https://json-schema.org/keyword/draft-2019-09/recursiveAnchor",
  shape: "data",
  valueSchema: new URL("./recursiveAnchor.schema.json", import.meta.url).href,
  resolve(valueNode, context) {
    if (valueNode.type === "json" && valueNode.jsonType === "boolean" && valueNode.value) {
      context.addDynamicAnchor("");
    }
  }
};
