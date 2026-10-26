import { all, hasProperty } from "./utilities.js";
import { uniqueStrings } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `required` since draft-04. A property whose value couldn't be parsed is
 * present.
 *
 * @type Keyword<string[], "data">
 */
export default {
  uri: "https://json-schema.org/keyword/required",
  shape: "data",
  check: uniqueStrings,
  lower: (required) => all(required.map(hasProperty))
};
