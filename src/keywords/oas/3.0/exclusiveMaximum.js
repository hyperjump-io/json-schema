import { boolean } from "../../checks.js";

/**
 * @import { Keyword } from "../../../keyword.d.ts"
 */

/**
 * `exclusiveMaximum` in OpenAPI 3.0. It's a boolean that makes the sibling
 * `maximum` exclusive, as in draft-04, which reads it. 3.0's JSON Schema
 * draft (draft-wright-00) doesn't require `maximum` with it, as draft-04
 * does, so without `maximum` it has no effect.
 *
 * @type Keyword<boolean, "data">
 */
export default {
  uri: "https://spec.openapis.org/oas/3.0/keyword/exclusiveMaximum",
  shape: "data",
  check: boolean
};
