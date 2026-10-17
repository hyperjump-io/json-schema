/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `else`. It has no effect on its own. The sibling `if` evaluates it.
 *
 * @type Keyword<null>
 */
export default {
  uri: "https://json-schema.org/keyword/else",
  shape: "schema",
  valueSchema: new URL("./else.schema.json", import.meta.url).href,
  compile: () => null
};
