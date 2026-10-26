import { nonNegativeInteger } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `maxLength`. Length is in code points.
 *
 * @type Keyword<number, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/maxLength",
  shape: "data",
  check: nonNegativeInteger,
  lower: (max) => ({ op: "stringLength", max })
};
