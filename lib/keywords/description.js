import * as Browser from "@hyperjump/browser";
import * as Instance from "../../annotations/annotated-instance.js";


const id = "https://json-schema.org/keyword/description";

const description = "An explanation about the purpose of the instance described by the schema. Read more: https://www.learnjsonschema.com/2020-12/meta-data/description/";

const compile = (schema) => Browser.value(schema);

const interpret = (description, instance, _ast, _dynamicAnchors, _quiet, schemaLocation) => {
  Instance.setAnnotation(instance, id, schemaLocation, description);
  return true;
};

export default { id, description, compile, interpret };
