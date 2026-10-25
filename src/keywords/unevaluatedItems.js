/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `unevaluatedItems`. It applies to the items that no other keyword
 * evaluated, including ones evaluated by subschemas that apply to the same
 * instance (`allOf`, `$ref`, …) and passed.
 *
 * @type Keyword<Expression>
 */
export default {
  uri: "https://json-schema.org/keyword/unevaluatedItems",
  shape: "schema",
  lower: (schema) => ({ op: "eachItem", unevaluated: true, of: schema })
};
