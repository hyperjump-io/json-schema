import typeKeyword from "../type.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 * @import { SchemaType } from "../type.js"
 */

/**
 * `type` in draft-04 through 2020-12. It's the same as `type`, except that
 * an array can be empty, which these drafts allow. Nothing is valid against
 * it.
 *
 * @type Keyword<SchemaType | SchemaType[]>
 */
export default {
  ...typeKeyword,
  uri: "https://json-schema.org/keyword/draft-2020-12/type",
  check(valueNode, context) {
    if (valueNode.jsonType === "array" && valueNode.children.length === 0) {
      return;
    }

    /** @type NonNullable<typeof typeKeyword.check> */ (typeKeyword.check)(valueNode, context);
  }
};
