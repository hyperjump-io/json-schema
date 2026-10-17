import { isEmail } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `email`. An email address (RFC 5321).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/email",
  validate: (value) => typeof value !== "string" || isEmail(value)
};
