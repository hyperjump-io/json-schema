import { nonNegativeInteger } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `minLength`. Length is in code points.
 *
 * @type Keyword<number, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/minLength",
  shape: "data",
  check: nonNegativeInteger,
  lower: (min) => ({ op: "stringLength", min })
};
