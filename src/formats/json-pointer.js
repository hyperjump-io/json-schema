import { isJsonPointer } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `json-pointer`. A JSON Pointer (RFC 6901).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/json-pointer",
  types: ["string"],
  validate: (value) => isJsonPointer(/** @type string */ (value))
};
