/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `items` since 2020-12. It applies to the items after the ones the sibling
 * `prefixItems` applies to.
 *
 * @type Keyword<Expression>
 */
export default {
  uri: "https://json-schema.org/keyword/items",
  siblings: { prefixItems: "https://json-schema.org/keyword/prefixItems" },
  shape: "schema",
  lower: (schema, { prefixItems }) => ({ op: "eachItem", from: prefixItems?.length ?? 0, of: schema })
};
