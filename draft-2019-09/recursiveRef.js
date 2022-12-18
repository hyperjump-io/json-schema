import Validate from "../lib/keywords/validate.js";


const id = "https://json-schema.org/keyword/draft-2019-09/recursiveRef";

const compile = async (schema) => schema.id;

const interpret = (id, instance, ast, dynamicAnchors) => {
  if ("" in ast.metaData[id].dynamicAnchors) {
    return Validate.interpret(dynamicAnchors[""], instance, ast, dynamicAnchors);
  } else {
    return Validate.interpret(`${id}#`, instance, ast, dynamicAnchors);
  }
};

const collectEvaluatedProperties = Validate.collectEvaluatedProperties;
const collectEvaluatedItems = Validate.collectEvaluatedItems;

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
