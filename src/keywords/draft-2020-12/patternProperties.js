import patternPropertiesKeyword, { checkPatternNames } from "../patternProperties.js";
import { isPattern } from "../utilities.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 * @import { Expression } from "../../kernel/kernel.d.ts"
 */

/**
 * `patternProperties` in draft-04 through 2020-12. It's the same as
 * `patternProperties`, except that a pattern that's only valid without the
 * `u` flag is used without it, as in draft-2020-12's `pattern`.
 *
 * @type Keyword<[string, Expression][], { map: "schema" }>
 */
export default {
  ...patternPropertiesKeyword,
  uri: "https://json-schema.org/keyword/draft-2020-12/patternProperties",
  check: checkPatternNames(isPattern)
};
