import { isHostname } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `hostname`. A hostname as RFC 1123 defines it, which v1, draft-04, and
 * draft-06 use. Labels aren't checked as IDNs.
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/hostname",
  types: ["string"],
  validate: (value) => isHostname(/** @type string */ (value))
};
