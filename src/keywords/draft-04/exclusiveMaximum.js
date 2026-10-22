import { siblingKeyword } from "../utilities.js";
import { boolean } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `exclusiveMaximum` in draft-04. It's a boolean that makes the sibling
 * `maximum` exclusive. Draft-04 requires `maximum` with it.
 *
 * @type Keyword<boolean>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-04/exclusiveMaximum",
  shape: "data",
  check(valueNode, context) {
    boolean(valueNode, context);
    if (siblingKeyword(context.schemaNode, "https://json-schema.org/keyword/draft-04/maximum") === undefined) {
      context.message("'exclusiveMaximum' requires 'maximum'");
    }
  }
};
