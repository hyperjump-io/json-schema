import { isIPv4 } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `ipv4`. An IPv4 address (RFC 2673).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/ipv4",
  validate: (value) => typeof value !== "string" || isIPv4(value)
};
