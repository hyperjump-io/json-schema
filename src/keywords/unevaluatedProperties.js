/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `unevaluatedProperties`. It applies to the properties that no other
 * keyword evaluated, including ones evaluated by subschemas that apply to
 * the same instance (`allOf`, `$ref`, …) and passed.
 *
 * @type Keyword<Expression>
 */
export default {
  uri: "https://json-schema.org/keyword/unevaluatedProperties",
  shape: "schema",
  lower: (schema) => ({ op: "eachProperty", select: { unevaluated: true }, of: schema })
};
