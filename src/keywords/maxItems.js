import { nonNegativeInteger } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `maxItems`
 *
 * @type Keyword<number, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/maxItems",
  shape: "data",
  check: nonNegativeInteger,
  lower: (max) => ({ op: "itemCount", max })
};
