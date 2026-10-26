import { all } from "./utilities.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `properties`
 *
 * @type Keyword<[string, Expression][], { map: "schema" }>
 */
export default {
  uri: "https://json-schema.org/keyword/properties",
  shape: { map: "schema" },
  lower: (pairs) => all(pairs.map(([name, schema]) => ({ op: "property", name, of: schema })))
};
