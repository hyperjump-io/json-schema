import { annotationKeyword } from "../../utilities.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Keyword } from "../../../keyword.d.ts"
 */

/**
 * `example` in OpenAPI 3.0 through 3.2. It's any value. 3.1 and 3.2 prefer
 * `examples`, and 3.2 deprecates it.
 *
 * @type Keyword<Json, "data">
 */
export default annotationKeyword("https://spec.openapis.org/oas/3.2/keyword/example");
