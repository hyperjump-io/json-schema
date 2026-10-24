import { boolean } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `uniqueItems`. Items are compared like `const` compares, so objects are
 * equal regardless of property order.
 *
 * @type Keyword<boolean>
 */
export default {
  uri: "https://json-schema.org/keyword/uniqueItems",
  shape: "data",
  default: false,
  check: boolean,
  lower: (uniqueItems) => uniqueItems ? { op: "uniqueItems" } : { op: "pass" }
};
