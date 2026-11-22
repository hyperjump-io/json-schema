import { all } from "./utilities.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `prefixItems`. Each schema applies to the item at the same index.
 *
 * @type Keyword<Expression[], { array: "schema" }>
 */
export default {
  uri: "https://json-schema.org/keyword/prefixItems",
  shape: { array: "schema" },
  lower: (schemas) => all(schemas.map((schema, index) => ({ op: "item", index, of: schema })))
};
