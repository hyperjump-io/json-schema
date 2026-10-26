/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `additionalProperties`. It applies to the properties that aren't in the
 * sibling `properties` and don't match the sibling `patternProperties`.
 *
 * @type Keyword<Expression, "schema", { properties?: [string, Expression][]; patternProperties?: [string, Expression][] }>
 */
export default {
  uri: "https://json-schema.org/keyword/additionalProperties",
  siblings: { properties: "https://json-schema.org/keyword/properties", patternProperties: "https://json-schema.org/keyword/patternProperties" },
  shape: "schema",
  lower: (schema, { properties = [], patternProperties = [] }) => ({
    op: "eachProperty",
    select: { except: { names: properties.map(([name]) => name), patterns: patternProperties.map(([pattern]) => pattern) } },
    of: schema
  })
};
