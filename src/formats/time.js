import { isTime } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `time`. A full time (RFC 3339). Leap seconds aren't allowed, because there's no date.
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/time",
  types: ["string"],
  validate: (value) => isTime(/** @type string */ (value))
};
