import { isRelativeJsonPointer } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `relative-json-pointer`. A relative JSON Pointer.
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/relative-json-pointer",
  types: ["string"],
  validate: (value) => isRelativeJsonPointer(/** @type string */ (value))
};
