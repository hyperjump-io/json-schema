import { boolean } from "../../checks.js";

/**
 * @import { Keyword } from "../../../keyword.d.ts"
 */

/**
 * `nullable` in OpenAPI 3.0. `true` adds `null` to the sibling `type`, which
 * reads it. It has no effect on its own, so it has no keyword group, and
 * without `type` it does nothing, as the spec says.
 *
 * @type Keyword<boolean, "data">
 */
export default {
  uri: "https://spec.openapis.org/oas/3.0/keyword/nullable",
  shape: "data",
  check: boolean
};
