import { annotationKeyword } from "../../utilities.js";
import { mapOf, objectOf, string } from "../../checks.js";

/**
 * @import { Keyword } from "../../../keyword.d.ts"
 */

/**
 * @typedef {{ propertyName: string; mapping?: Record<string, string>; defaultMapping?: string }} Discriminator
 */

/**
 * `discriminator` in OpenAPI 3.2. It's 3.1's, with `defaultMapping`.
 *
 * @type Keyword<Discriminator, "data">
 */
export default annotationKeyword("https://spec.openapis.org/oas/3.2/keyword/discriminator", objectOf({
  propertyName: string,
  mapping: mapOf(string),
  defaultMapping: string
}, ["propertyName"]));
