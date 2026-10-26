import { nonNegativeInteger } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `maxContains`. The maximum number of items that pass the sibling `contains`. It has no effect on its own. `contains` reads it.
 *
 * @type Keyword<number, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/maxContains",
  shape: "data",
  check: nonNegativeInteger
};
