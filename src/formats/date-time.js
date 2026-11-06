import { isDateTimeExt } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `date-time`. A date and time (RFC 3339), with the time zone and tag
 * suffixes RFC 9557 adds.
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/date-time",
  types: ["string"],
  validate: (value) => isDateTimeExt(/** @type string */ (value))
};
