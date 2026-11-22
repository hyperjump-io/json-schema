import maximumKeyword from "../../draft-04/maximum.js";

/**
 * @import { Keyword } from "../../../keyword.d.ts"
 */

/**
 * `maximum` in OpenAPI 3.0. It's draft-04's, with 3.0's `exclusiveMaximum`
 * as its sibling.
 *
 * @type Keyword<number, "data">
 */
export default {
  ...maximumKeyword,
  uri: "https://spec.openapis.org/oas/3.0/keyword/maximum",
  siblings: { exclusiveMaximum: "https://spec.openapis.org/oas/3.0/keyword/exclusiveMaximum" }
};
