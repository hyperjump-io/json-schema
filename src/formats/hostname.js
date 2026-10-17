import { isAsciiIdn } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `hostname`. A hostname of A-labels and NR-LDH labels (RFC 5890).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/hostname",
  validate: (value) => typeof value !== "string" || isAsciiIdn(value)
};
