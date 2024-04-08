import * as Browser from "@hyperjump/browser";
import * as Instance from "../../annotations/annotated-instance.js";


const id = "https://json-schema.org/keyword/writeOnly";

const description = "This keyword indicates that the value is never present when the instance is retrieved from the owning authority. Read more: https://www.learnjsonschema.com/2020-12/meta-data/writeonly/";

const compile = (schema) => Browser.value(schema);

const interpret = (writeOnly, instance, _ast, _dynamicAnchors, _quiet, schemaLocation) => {
  Instance.setAnnotation(instance, id, schemaLocation, writeOnly);
  return true;
};

export default { id, description, compile, interpret };
