import { isIdnEmail } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `idn-email`. An internationalized email address (RFC 6531).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/idn-email",
  validate: (value) => typeof value !== "string" || isIdnEmail(value)
};
