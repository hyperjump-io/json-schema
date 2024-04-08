import * as Browser from "@hyperjump/browser";
import * as Instance from "../../annotations/annotated-instance.js";


const id = "https://json-schema.org/keyword/default";

const description = "This keyword can be used to supply a default JSON value associated with a particular schema. Read more: https://www.learnjsonschema.com/2020-12/meta-data/default/";

const compile = (schema) => Browser.value(schema);

const interpret = (value, instance, _ast, _dynamicAnchors, _quiet, schemaLocation) => {
  Instance.setAnnotation(instance, id, schemaLocation, value);
  return true;
};

export default { id, description, compile, interpret };
