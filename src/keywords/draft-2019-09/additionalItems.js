/**
 * @import { Keyword } from "../../keyword.d.ts"
 * @import { Expression } from "../../kernel/kernel.d.ts"
 */

/**
 * `additionalItems` in draft-04 through 2019-09. It applies to the items
 * after the ones the sibling `items` applies to when that's an array of
 * schemas. Otherwise, it has no effect.
 *
 * @type Keyword<Expression>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-2019-09/additionalItems",
  siblings: { items: "https://json-schema.org/keyword/draft-2019-09/items" },
  shape: "schema",
  default: true,
  lower: (schema, { items }) => Array.isArray(items)
    ? { op: "eachItem", from: items.length, of: schema }
    : { op: "pass" }
};
