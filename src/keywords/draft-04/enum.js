import enumKeyword from "../enum.js";
import { duplicateItems } from "../utilities.js";
import { array, nonEmpty } from "../checks.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `enum` in draft-04. It's the same as `enum`, except that it can't be empty
 * and its values must be unique, as draft-04 says. Later drafts only say
 * they should be.
 *
 * @type Keyword<Json[], "data">
 */
export default {
  ...enumKeyword,
  uri: "https://json-schema.org/keyword/draft-04/enum",
  check(valueNode, context) {
    array(valueNode, context);
    nonEmpty(valueNode, context);
    if (valueNode.jsonType === "array") {
      for (const itemNode of duplicateItems(valueNode)) {
        context.message("This value is a duplicate", itemNode);
      }
    }
  }
};
