import { canonicalUri } from "../schema.js";
import * as Instance from "../../annotations/annotated-instance.js";


const id = "https://json-schema.org/keyword/contentSchema";

const description = "This keyword declares a schema which describes the structure of the string. Read more: https://www.learnjsonschema.com/2020-12/content/contentschema/";

const compile = (contentSchema) => canonicalUri(contentSchema);

const interpret = (contentSchema, instance, _ast, _dynamicAnchors, _quiet, schemaLocation) => {
  Instance.setAnnotation(instance, id, schemaLocation, contentSchema);
  return true;
};

export default { id, description, compile, interpret };
