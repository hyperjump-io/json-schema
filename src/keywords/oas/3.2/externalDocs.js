import { isUriReference } from "@hyperjump/json-schema-formats";
import { annotationKeyword } from "../../utilities.js";
import { expected, objectOf, string } from "../../checks.js";

/**
 * @import { Keyword } from "../../../keyword.d.ts"
 */

/**
 * @typedef {{ url: string; description?: string }} ExternalDocs
 */

/**
 * `externalDocs` in OpenAPI 3.0 through 3.2, an External Documentation
 * Object
 *
 * @type Keyword<ExternalDocs, "data">
 */
export default annotationKeyword("https://spec.openapis.org/oas/3.2/keyword/externalDocs", objectOf({
  url: expected("a URI reference", (node) => node.jsonType === "string" && isUriReference(node.value)),
  description: string
}, ["url"]));
