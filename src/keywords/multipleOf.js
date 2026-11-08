import { positiveNumber } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `multipleOf`. Numbers are compared as the decimals they're written as,
 * which floating point division can't do exactly (see `multipleOf` in `src/kernel/fast.js`).
 *
 * @type Keyword<number, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/multipleOf",
  shape: "data",
  check: positiveNumber,
  lower: (divisor) => ({ op: "multipleOf", divisor })
};
