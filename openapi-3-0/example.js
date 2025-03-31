import * as Browser from "@hyperjump/browser";
import * as Instance from "../annotations/annotated-instance.js";


const id = "https://spec.openapis.org/oas/3.0/keyword/example";

const compile = (schema) => Browser.value(schema);

const interpret = (example, instance, { annotations, schemaUri }) => {
  annotations.push({
    keyword: id,
    absoluteKeywordLocation: schemaUri,
    instanceLocation: Instance.uri(instance),
    annotation: example
  });
  return true;
};

export default { id, compile, interpret };
