import { nonNegativeInteger } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `minProperties`
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/minProperties",
  shape: "data",
  default: 0,
  check: nonNegativeInteger,
  lower: (min) => ({ op: "propertyCount", min })
};
