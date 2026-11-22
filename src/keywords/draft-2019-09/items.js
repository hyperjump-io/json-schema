import { all } from "../utilities.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 * @import { Expression } from "../../kernel/kernel.d.ts"
 */

/**
 * `items` in draft-04 through 2019-09. An array of schemas applies to the
 * items at the same index, like `prefixItems`. A schema applies to every
 * item, like `items` without `prefixItems`.
 *
 * @type Keyword<Expression | Expression[], ["schema", { array: "schema" }]>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-2019-09/items",
  shape: ["schema", { array: "schema" }],
  lower: (items) => Array.isArray(items)
    ? all(items.map((schema, index) => ({ op: "item", index, of: schema })))
    : { op: "eachItem", from: 0, of: items }
};
