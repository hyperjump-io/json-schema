import { isHostname } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../../format.d.ts"
 */

/**
 * `hostname` in draft-04 and draft-06. A hostname as RFC 1123 defines it.
 * Labels aren't checked as IDNs.
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/draft-04/hostname",
  validate: (value) => typeof value !== "string" || isHostname(value)
};
