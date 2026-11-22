import requiredKeyword from "../required.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `required` in draft-04. It's the same as `required`. Draft-04 says it
 * can't be empty, but an empty array is the same as leaving it out, so
 * `empty-array` reports it. It has a URI of its own so lint can tell.
 *
 * @type Keyword<string[], "data">
 */
export default {
  ...requiredKeyword,
  uri: "https://json-schema.org/keyword/draft-04/required"
};
