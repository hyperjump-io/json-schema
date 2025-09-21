import { isUri } from "@hyperjump/uri";


export default {
  id: "https://json-schema.org/format/uri",
  handler: (uri) => typeof uri !== "string" || isUri(uri)
};
