import { isUriTemplate } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `uri-template`. A URI template (RFC 6570).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/uri-template",
  types: ["string"],
  validate: (value) => isUriTemplate(/** @type string */ (value))
};
