import keywordSchema from "./ref.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `$ref` in draft-04 through draft-07. The schema is a reference, and every
 * other keyword in it is ignored.
 *
 * @type Keyword
 */
export default {
  uri: "https://json-schema.org/keyword/draft-04/ref",
  shape: "data",
  schema: keywordSchema,
  resolve(valueNode, context) {
    if (valueNode.type === "json" && valueNode.jsonType === "string") {
      context.setReference(valueNode.value);
    }
  }
};
