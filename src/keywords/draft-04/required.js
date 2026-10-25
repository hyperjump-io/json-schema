import requiredKeyword from "../required.js";
import { nonEmpty, uniqueStrings } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `required` in draft-04. It's the same as `required`, except that it can't
 * be empty, as draft-04 says.
 *
 * @type Keyword<string[]>
 */
export default {
  ...requiredKeyword,
  uri: "https://json-schema.org/keyword/draft-04/required",
  // An empty array, which is the same as leaving it out, isn't allowed
  check(valueNode, context) {
    uniqueStrings(valueNode, context);
    nonEmpty(valueNode, context);
  }
};
