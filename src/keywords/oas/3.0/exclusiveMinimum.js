import { boolean } from "../../checks.js";

/**
 * @import { Keyword } from "../../../keyword.d.ts"
 */

/**
 * `exclusiveMinimum` in OpenAPI 3.0. It's a boolean that makes the sibling
 * `minimum` exclusive, as in draft-04, which reads it. 3.0's JSON Schema
 * draft (draft-wright-00) doesn't require `minimum` with it, as draft-04
 * does, so without `minimum` it has no effect.
 *
 * @type Keyword<boolean, "data">
 */
export default {
  uri: "https://spec.openapis.org/oas/3.0/keyword/exclusiveMinimum",
  shape: "data",
  check: boolean
};
