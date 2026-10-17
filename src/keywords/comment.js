/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `$comment`. It's for schema authors and has no effect.
 *
 * @type Keyword
 */
export default {
  uri: "https://json-schema.org/keyword/comment",
  shape: "data",
  valueSchema: new URL("./comment.schema.json", import.meta.url).href
};
