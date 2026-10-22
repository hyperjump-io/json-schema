import { isDateTime } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `date-time`. A date and time (RFC 3339).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/date-time",
  types: ["string"],
  validate: (value) => isDateTime(/** @type string */ (value))
};
