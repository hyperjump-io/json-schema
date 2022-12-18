import Validate from "../lib/keywords/validate.js";
import * as Schema from "../lib/schema.js";


const id = "https://json-schema.org/keyword/draft-2020-12/dynamicRef";

const compile = async (dynamicRef, ast) => {
  const [, fragment] = splitUrl(Schema.value(dynamicRef));
  const referencedSchema = await Schema.get(Schema.value(dynamicRef), dynamicRef);
  await Validate.compile(referencedSchema, ast);
  return [referencedSchema.id, fragment, Schema.uri(referencedSchema)];

};

const interpret = ([id, fragment, ref], instance, ast, dynamicAnchors) => {
  if (fragment in ast.metaData[id].dynamicAnchors) {
    return Validate.interpret(dynamicAnchors[fragment], instance, ast, dynamicAnchors);
  } else {
    return Validate.interpret(ref, instance, ast, dynamicAnchors);
  }
};

const collectEvaluatedProperties = Validate.collectEvaluatedProperties;
const collectEvaluatedItems = Validate.collectEvaluatedItems;

const splitUrl = (url) => {
  const indexOfHash = url.indexOf("#");
  const ndx = indexOfHash === -1 ? url.length : indexOfHash;
  const urlReference = url.slice(0, ndx);
  const urlFragment = url.slice(ndx + 1);

  return [decodeURI(urlReference), decodeURI(urlFragment)];
};

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
