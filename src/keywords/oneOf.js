/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `oneOf`
 *
 * @type Keyword<Expression[], { array: "schema" }>
 */
export default {
  uri: "https://json-schema.org/keyword/oneOf",
  shape: { array: "schema" },
  lower: (schemas) => ({ op: "one", of: schemas })
};
