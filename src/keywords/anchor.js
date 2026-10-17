/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `$anchor` since 2019-09. It identifies a schema with a plain-name fragment.
 *
 * @type Keyword
 */
export default {
  uri: "https://json-schema.org/keyword/anchor",
  shape: "data",
  valueSchema: new URL("./anchor.schema.json", import.meta.url).href,
  resolve(valueNode, context) {
    if (valueNode.type === "json" && valueNode.jsonType === "string") {
      context.addAnchor(valueNode.value);
    }
  }
};
