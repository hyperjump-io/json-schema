import minimumKeyword from "../../draft-04/minimum.js";

/**
 * @import { Keyword } from "../../../keyword.d.ts"
 */

/**
 * `minimum` in OpenAPI 3.0. It's draft-04's, with 3.0's `exclusiveMinimum`
 * as its sibling.
 *
 * @type Keyword<number, "data">
 */
export default {
  ...minimumKeyword,
  uri: "https://spec.openapis.org/oas/3.0/keyword/minimum",
  siblings: { exclusiveMinimum: "https://spec.openapis.org/oas/3.0/keyword/exclusiveMinimum" }
};
