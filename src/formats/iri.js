import { isIri } from "@hyperjump/json-schema-formats";

/**
 * @import { Format } from "../format.d.ts"
 */

/**
 * `iri`. An IRI (RFC 3987).
 *
 * @type Format
 */
export default {
  uri: "https://json-schema.org/format/iri",
  types: ["string"],
  validate: (value) => isIri(/** @type string */ (value))
};
