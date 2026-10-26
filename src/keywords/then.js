/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `then`. It has no effect on its own. The sibling `if` evaluates it.
 *
 * @type Keyword<Expression, "schema">
 */
export default {
  uri: "https://json-schema.org/keyword/then",
  shape: "schema"
};
