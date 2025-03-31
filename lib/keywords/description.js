import * as Browser from "@hyperjump/browser";
import * as Instance from "../../annotations/annotated-instance.js";


const id = "https://json-schema.org/keyword/description";

const compile = (schema) => Browser.value(schema);

const interpret = (description, instance, { annotations, schemaUri }) => {
  annotations.push({
    keyword: id,
    absoluteKeywordLocation: schemaUri,
    instanceLocation: Instance.uri(instance),
    annotation: description
  });
  return true;
};

export default { id, compile, interpret };
