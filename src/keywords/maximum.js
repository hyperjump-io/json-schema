import { number } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `maximum`
 *
 * @type Keyword<number, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/maximum",
  shape: "data",
  check: number,
  lower: (max) => ({ op: "range", max })
};
