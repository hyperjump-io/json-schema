import { isUriReference } from "@hyperjump/uri";


export default {
  id: "https://json-schema.org/format/uri-reference",
  handler: (uri) => typeof uri !== "string" || isUriReference(uri)
};
