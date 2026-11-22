import { boolean } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `exclusiveMaximum` in draft-04. It's a boolean that makes the sibling
 * `maximum` exclusive, which reads it. Draft-04 says `maximum` must be there
 * too, but without it, `exclusiveMaximum` has no effect, so
 * `exclusive-limit-without-limit` reports it.
 *
 * @type Keyword<boolean, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/draft-04/exclusiveMaximum",
  shape: "data",
  check: boolean
};
