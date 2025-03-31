import { canonicalUri } from "../schema.js";
import * as Instance from "../../annotations/annotated-instance.js";


const id = "https://json-schema.org/keyword/contentSchema";

const compile = (contentSchema) => canonicalUri(contentSchema);

const interpret = (contentSchema, instance, { annotations, schemaUri }) => {
  annotations.push({
    keyword: id,
    absoluteKeywordLocation: schemaUri,
    instanceLocation: Instance.uri(instance),
    annotation: contentSchema
  });
  return true;
};

export default { id, compile, interpret };
