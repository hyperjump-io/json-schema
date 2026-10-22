import { isDuration } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `duration`. A duration (RFC 3339, Appendix A).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/duration",
  types: ["string"],
  validate: (value) => isDuration(/** @type string */ (value))
};
