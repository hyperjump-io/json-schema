/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `else`. It has no effect on its own. The sibling `if` evaluates it.
 *
 * @type Keyword<Expression, "schema">
 */
export default {
  uri: "https://json-schema.org/keyword/else",
  shape: "schema"
};
