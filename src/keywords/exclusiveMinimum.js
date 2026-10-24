import { number } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `exclusiveMinimum` since draft-06. It's a number, not a boolean.
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/exclusiveMinimum",
  shape: "data",
  check: number,
  lower: (min) => ({ op: "range", min, exclusiveMin: true })
};
