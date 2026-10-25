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
  siblings: { maximum: "https://json-schema.org/keyword/draft-04/maximum" },
  shape: "data",
  check(valueNode, context) {
    boolean(valueNode, context);
    if (context.siblings.maximum === undefined) {
      context.message("'exclusiveMaximum' requires 'maximum'");
    }
  }
};
