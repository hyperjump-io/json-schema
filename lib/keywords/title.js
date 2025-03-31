import * as Browser from "@hyperjump/browser";
import * as Instance from "../../annotations/annotated-instance.js";


const id = "https://json-schema.org/keyword/title";

const compile = (schema) => Browser.value(schema);

const interpret = (title, instance, { annotations, schemaUri }) => {
  annotations.push({
    keyword: id,
    absoluteKeywordLocation: schemaUri,
    instanceLocation: Instance.uri(instance),
    annotation: title
  });
  return true;
};

export default { id, compile, interpret };
