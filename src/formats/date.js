import { isDate } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `date`. A full date (RFC 3339).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/date",
  types: ["string"],
  validate: (value) => isDate(/** @type string */ (value))
};
