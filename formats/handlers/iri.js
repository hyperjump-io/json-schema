import { isIri } from "@hyperjump/uri";


export default {
  id: "https://json-schema.org/format/iri",
  handler: (uri) => typeof uri !== "string" || isIri(uri)
};
