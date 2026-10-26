import { string } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `$ref` in draft-04 through draft-07. The schema is a reference, and every
 * other keyword in it is ignored.
 *
 * @type Keyword<string, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/draft-07/ref",
  shape: "data",
  check: string,
  resolve(valueNode, context) {
    if (valueNode.type === "json" && valueNode.jsonType === "string") {
      context.setReference(valueNode.value);
    }
  }
};
