import { nonNegativeInteger } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `maxProperties`
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/maxProperties",
  shape: "data",
  check: nonNegativeInteger,
  lower: (max) => ({ op: "propertyCount", max })
};
