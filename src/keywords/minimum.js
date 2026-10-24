import { number } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `minimum`
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/minimum",
  shape: "data",
  check: number,
  lower: (min) => ({ op: "range", min })
};
