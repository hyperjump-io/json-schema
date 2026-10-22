import { isUri } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `uri`. A URI (RFC 3986).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/uri",
  types: ["string"],
  validate: (value) => isUri(/** @type string */ (value))
};
