import * as Browser from "@hyperjump/browser";
import * as Instance from "../../annotations/annotated-instance.js";


const id = "https://json-schema.org/keyword/deprecated";

const description = "This keyword indicates that applications should refrain from using the declared property. Read more: https://www.learnjsonschema.com/2020-12/meta-data/deprecated/";

const compile = (schema) => Browser.value(schema);

const interpret = (deprecated, instance, _ast, _dynamicAnchors, _quiet, schemaLocation) => {
  Instance.setAnnotation(instance, id, schemaLocation, deprecated);
  return true;
};

export default { id, description, compile, interpret };
