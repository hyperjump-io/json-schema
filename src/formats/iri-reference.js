import { isIriReference } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `iri-reference`. An IRI reference (RFC 3987).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/iri-reference",
  types: ["string"],
  validate: (value) => isIriReference(/** @type string */ (value))
};
