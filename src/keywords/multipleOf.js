import { positiveNumber } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `multipleOf`. Floating point division is inexact, so a quotient within a
 * few units of rounding error of an integer counts as one.
 *
 * @type Keyword<number, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/multipleOf",
  shape: "data",
  check: positiveNumber,
  lower: (divisor) => ({ op: "multipleOf", divisor })
};
