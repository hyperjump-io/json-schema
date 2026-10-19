/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `$defs`. Its schemas are only compiled when something references them.
 *
 * @type Keyword<null>
 */
export default {
  uri: "https://json-schema.org/keyword/definitions",
  shape: { map: "schema" },
  compile: () => null
};
