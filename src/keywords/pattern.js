import { regex } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `pattern`. It's an ECMA-262 regular expression with the `u` flag. It isn't
 * anchored.
 *
 * @type Keyword<string>
 */
export default {
  uri: "https://json-schema.org/keyword/pattern",
  shape: "data",
  check: regex,
  lower: (pattern) => ({ op: "matches", pattern })
};
