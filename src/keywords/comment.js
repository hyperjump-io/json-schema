import { string } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `$comment`. It's for schema authors and has no effect.
 *
 * @type Keyword<string, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/comment",
  shape: "data",
  check: string
};
