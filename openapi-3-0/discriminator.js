import * as Browser from "@hyperjump/browser";
import * as Instance from "../annotations/annotated-instance.js";


const id = "https://spec.openapis.org/oas/3.0/keyword/discriminator";

const compile = (schema) => Browser.value(schema);

const interpret = (discriminator, instance, { annotations, schemaUri }) => {
  annotations.push({
    keyword: id,
    absoluteKeywordLocation: schemaUri,
    instanceLocation: Instance.uri(instance),
    annotation: discriminator
  });
  return true;
};

export default { id, compile, interpret };
