import { positiveNumber } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `multipleOf`. Floating point division is inexact, so a remainder that's
 * close enough to zero, or to `multipleOf`, counts as none.
 *
 * @type Keyword<number, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/multipleOf",
  shape: "data",
  check: positiveNumber,
  lower: (divisor) => ({ op: "multipleOf", divisor })
};
