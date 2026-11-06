import { isDateTime } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../../format.d.ts"
 */

/**
 * `date-time` in draft-04 through 2020-12. A date and time as RFC 3339
 * defines it, without RFC 9557's suffixes.
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/draft-2020-12/date-time",
  types: ["string"],
  validate: (value) => isDateTime(/** @type string */ (value))
};
