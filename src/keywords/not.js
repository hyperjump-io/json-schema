/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `not`
 *
 * @type Keyword<Expression>
 */
export default {
  uri: "https://json-schema.org/keyword/not",
  shape: "schema",
  lower: (schema) => ({ op: "not", of: schema })
};
