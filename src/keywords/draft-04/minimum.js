import { number } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `minimum` in draft-04. It's exclusive if the sibling `exclusiveMinimum`
 * is `true`.
 *
 * @type Keyword<number, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/draft-04/minimum",
  siblings: { exclusiveMinimum: "https://json-schema.org/keyword/draft-04/exclusiveMinimum" },
  shape: "data",
  check: number,
  lower: (min, { exclusiveMinimum }) => ({ op: "range", min, exclusiveMin: exclusiveMinimum === true })
};
