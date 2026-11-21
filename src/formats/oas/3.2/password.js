/**
 * @import { Format } from "../../../format.d.ts"
 */

/**
 * `password` in OpenAPI 3.0 through 3.2. It's a hint to obscure the value,
 * so every string is valid.
 *
 * @type Format
 */
export default {
  uri: "https://spec.openapis.org/oas/3.2/format/password",
  types: ["string"],
  validate: () => true
};
