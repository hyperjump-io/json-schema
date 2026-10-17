/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `then`. It has no effect on its own. The sibling `if` evaluates it.
 *
 * @type Keyword<null>
 */
export default {
  uri: "https://json-schema.org/keyword/then",
  shape: "schema",
  valueSchema: new URL("./then.schema.json", import.meta.url).href,
  compile: () => null
};
