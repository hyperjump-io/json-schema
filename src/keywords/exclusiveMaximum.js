import { number } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `exclusiveMaximum` since draft-06. It's a number, not a boolean.
 *
 * @type Keyword<number, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/exclusiveMaximum",
  shape: "data",
  check: number,
  lower: (max) => ({ op: "range", max, exclusiveMax: true })
};
