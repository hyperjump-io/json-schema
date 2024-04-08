import * as Browser from "@hyperjump/browser";
import * as Instance from "../../annotations/annotated-instance.js";


const id = "https://json-schema.org/keyword/contentEncoding";

const description = "The string instance should be interpreted as encoded binary data and decoded using the encoding named by this property. Read more: https://www.learnjsonschema.com/2020-12/content/contentencoding/";

const compile = (schema) => Browser.value(schema);

const interpret = (contentEncoding, instance, _ast, _dynamicAnchors, _quiet, schemaLocation) => {
  Instance.setAnnotation(instance, id, schemaLocation, contentEncoding);
  return true;
};

export default { id, description, compile, interpret };
