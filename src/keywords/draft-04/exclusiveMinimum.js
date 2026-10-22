import { siblingKeyword } from "../utilities.js";
import { boolean } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `exclusiveMinimum` in draft-04. It's a boolean that makes the sibling
 * `minimum` exclusive. Draft-04 requires `minimum` with it.
 *
 * @type Keyword<boolean>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-04/exclusiveMinimum",
  shape: "data",
  check(valueNode, context) {
    boolean(valueNode, context);
    if (siblingKeyword(context.schemaNode, "https://json-schema.org/keyword/draft-04/minimum") === undefined) {
      context.message("'exclusiveMinimum' requires 'minimum'");
    }
  }
};
