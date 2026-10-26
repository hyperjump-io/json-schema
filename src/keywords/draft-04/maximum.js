import { number } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `maximum` in draft-04. It's exclusive if the sibling `exclusiveMaximum`
 * is `true`.
 *
 * @type Keyword<number, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/draft-04/maximum",
  siblings: { exclusiveMaximum: "https://json-schema.org/keyword/draft-04/exclusiveMaximum" },
  shape: "data",
  check: number,
  lower: (max, { exclusiveMaximum }) => ({ op: "range", max, exclusiveMax: exclusiveMaximum === true })
};
