import { annotationKeyword } from "../../utilities.js";
import { mapOf, objectOf, string } from "../../checks.js";

/**
 * @import { Keyword } from "../../../keyword.d.ts"
 */

/**
 * @typedef {{ propertyName: string; mapping?: Record<string, string> }} Discriminator
 */

/**
 * `discriminator` in OpenAPI 3.0 and 3.1. It's an annotation that tells
 * tools which schema of a `oneOf` or `anyOf` applies. It doesn't change
 * what's valid.
 *
 * @type Keyword<Discriminator, "data">
 */
export default annotationKeyword("https://spec.openapis.org/oas/3.1/keyword/discriminator", objectOf({
  propertyName: string,
  mapping: mapOf(string)
}, ["propertyName"]));
