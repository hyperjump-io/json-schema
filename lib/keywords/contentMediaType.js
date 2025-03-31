import * as Browser from "@hyperjump/browser";
import * as Instance from "../../annotations/annotated-instance.js";


const id = "https://json-schema.org/keyword/contentMediaType";

const compile = (schema) => Browser.value(schema);

const interpret = (contentMediaType, instance, { annotations, schemaUri }) => {
  annotations.push({
    keyword: id,
    absoluteKeywordLocation: schemaUri,
    instanceLocation: Instance.uri(instance),
    annotation: contentMediaType
  });
  return true;
};

export default { id, compile, interpret };
