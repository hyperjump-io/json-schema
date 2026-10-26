import { nonNegativeInteger } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `minItems`
 *
 * @type Keyword<number, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/minItems",
  shape: "data",
  check: nonNegativeInteger,
  lower: (min) => ({ op: "itemCount", min })
};
