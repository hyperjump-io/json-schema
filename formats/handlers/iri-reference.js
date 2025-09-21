import { isIriReference } from "@hyperjump/uri";


export default {
  id: "https://json-schema.org/format/iri-reference",
  handler: (uri) => typeof uri !== "string" || isIriReference(uri)
};
