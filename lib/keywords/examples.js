import * as Browser from "@hyperjump/browser";
import * as Instance from "../../annotations/annotated-instance.js";


const id = "https://json-schema.org/keyword/examples";

const description = "This keyword is used to provide sample JSON values associated with a particular schema, for the purpose of illustrating usage. Read more: https://www.learnjsonschema.com/2020-12/meta-data/examples/";

const compile = (schema) => Browser.value(schema);

const interpret = (examples, instance, _ast, _dynamicAnchors, _quiet, schemaLocation) => {
  Instance.setAnnotation(instance, id, schemaLocation, examples);
  return true;
};

export default { id, description, compile, interpret };
