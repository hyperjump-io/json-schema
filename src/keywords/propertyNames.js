/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `propertyNames`. Each property name is evaluated as a string instance.
 * It doesn't count as evaluating the properties.
 *
 * @type Keyword<Expression>
 */
export default {
  uri: "https://json-schema.org/keyword/propertyNames",
  shape: "schema",
  lower: (schema) => ({ op: "eachPropertyName", of: schema })
};
