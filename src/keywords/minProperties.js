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
  check: nonNegativeInteger,
  lower: (min) => ({ op: "propertyCount", min })
};
