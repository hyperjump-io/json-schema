import { nonNegativeInteger } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `minLength`. Length is in code points.
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/minLength",
  shape: "data",
  default: 0,
  check: nonNegativeInteger,
  lower: (min) => ({ op: "stringLength", min })
};
