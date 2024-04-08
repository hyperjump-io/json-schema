import * as Browser from "@hyperjump/browser";
import * as Instance from "../../annotations/annotated-instance.js";


const id = "https://json-schema.org/keyword/contentMediaType";

const description = "This keyword declares the media type of the string instance. Read more: https://www.learnjsonschema.com/2020-12/content/contentmediatype/";

const compile = (schema) => Browser.value(schema);

const interpret = (contentMediaType, instance, _ast, _dynamicAnchors, _quiet, schemaLocation) => {
  Instance.setAnnotation(instance, id, schemaLocation, contentMediaType);
  return true;
};

export default { id, description, compile, interpret };
