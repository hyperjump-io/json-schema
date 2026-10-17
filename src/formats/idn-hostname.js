import { isIdn } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `idn-hostname`. An internationalized hostname (RFC 5890).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/idn-hostname",
  validate: (value) => typeof value !== "string" || isIdn(value)
};
