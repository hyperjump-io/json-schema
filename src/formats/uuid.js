import { isUuid } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `uuid`. A UUID (RFC 4122).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/uuid",
  types: ["string"],
  validate: (value) => isUuid(/** @type string */ (value))
};
