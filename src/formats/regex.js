import { isRegex } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `regex`. An ECMA-262 regular expression.
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/regex",
  types: ["string"],
  validate: (value) => isRegex(/** @type string */ (value))
};
