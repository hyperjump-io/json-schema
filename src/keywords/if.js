/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `if`. It evaluates the sibling `then` if it passes and the sibling `else`
 * if it doesn't, so `if` is only evaluated once. Errors from `then` and
 * `else` have their own keyword locations.
 *
 * @type Keyword<Expression>
 */
export default {
  uri: "https://json-schema.org/keyword/if",
  siblings: { then: "https://json-schema.org/keyword/then", else: "https://json-schema.org/keyword/else" },
  shape: "schema",
  lower: (schema, siblings) => ({ op: "cases", cases: [[schema, siblings.then ?? null]], otherwise: siblings.else ?? null })
};
