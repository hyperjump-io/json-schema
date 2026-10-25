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
  siblings: { minimum: "https://json-schema.org/keyword/draft-04/minimum" },
  shape: "data",
  check(valueNode, context) {
    boolean(valueNode, context);
    if (context.siblings.minimum === undefined) {
      context.message("'exclusiveMinimum' requires 'minimum'");
    }
  }
};
