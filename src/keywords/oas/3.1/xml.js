import { isUri } from "@hyperjump/json-schema-formats";
import { annotationKeyword } from "../../utilities.js";
import { boolean, expected, objectOf, string } from "../../checks.js";

/**
 * @import { Keyword } from "../../../keyword.d.ts"
 */

/**
 * @typedef {{
 *   name?: string;
 *   namespace?: string;
 *   prefix?: string;
 *   attribute?: boolean;
 *   wrapped?: boolean;
 * }} Xml
 */

/**
 * `xml` in OpenAPI 3.0 and 3.1, an XML Object. Its `namespace` is an
 * absolute URI.
 *
 * @type Keyword<Xml, "data">
 */
export default annotationKeyword("https://spec.openapis.org/oas/3.1/keyword/xml", objectOf({
  name: string,
  namespace: expected("an absolute URI", (node) => node.jsonType === "string" && isUri(node.value)),
  prefix: string,
  attribute: boolean,
  wrapped: boolean
}));
