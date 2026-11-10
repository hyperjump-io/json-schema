import patternKeyword from "../pattern.js";
import { pattern } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `pattern` in draft-04 through 2020-12. It's the same as `pattern`, except
 * that a pattern that's only valid without the `u` flag is used without it
 * (`patternRegExp`). These drafts allow some flexibility in regular
 * expressions, and real schemas escape punctuation that doesn't need it,
 * like `\&`, which is an identity escape only without the flag.
 *
 * @type Keyword<string, "data">
 */
export default {
  ...patternKeyword,
  uri: "https://json-schema.org/keyword/draft-2020-12/pattern",
  check: pattern
};
