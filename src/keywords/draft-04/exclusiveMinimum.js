import { boolean } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `exclusiveMinimum` in draft-04. It's a boolean that makes the sibling
 * `minimum` exclusive, which reads it. Draft-04 says `minimum` must be there
 * too, but without it, `exclusiveMinimum` has no effect, so
 * `exclusive-limit-without-limit` reports it.
 *
 * @type Keyword<boolean, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/draft-04/exclusiveMinimum",
  shape: "data",
  check: boolean
};
