import { isInt32 } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../../../format.d.ts"
 */

/**
 * `int32` in OpenAPI 3.0 through 3.2. A signed 32-bit integer.
 *
 * @type Format
 */
export default {
  uri: "https://spec.openapis.org/oas/3.2/format/int32",
  types: ["number"],
  validate: (value) => isInt32(/** @type number */ (value))
};
