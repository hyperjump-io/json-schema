import { isUriReference } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `uri-reference`. A URI reference (RFC 3986).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/uri-reference",
  types: ["string"],
  validate: (value) => isUriReference(/** @type string */ (value))
};
