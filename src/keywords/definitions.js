/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `$defs`. Its schemas are only compiled when something references them.
 *
 * @type Keyword<[string, Expression][], { map: "schema" }>
 */
export default {
  uri: "https://json-schema.org/keyword/definitions",
  shape: { map: "schema" }
};
