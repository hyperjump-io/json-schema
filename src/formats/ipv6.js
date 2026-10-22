import { isIPv6 } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `ipv6`. An IPv6 address (RFC 4291).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/ipv6",
  types: ["string"],
  validate: (value) => isIPv6(/** @type string */ (value))
};
