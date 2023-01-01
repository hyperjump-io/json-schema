import Validation from "../lib/keywords/validation.js";


const id = "https://json-schema.org/keyword/draft-2019-09/recursiveRef";

const compile = async (schema) => schema.id;

const interpret = (id, instance, ast, dynamicAnchors) => {
  if ("" in ast.metaData[id].dynamicAnchors) {
    return Validation.interpret(dynamicAnchors[""], instance, ast, dynamicAnchors);
  } else {
    return Validation.interpret(`${id}#`, instance, ast, dynamicAnchors);
  }
};

const collectEvaluatedProperties = Validation.collectEvaluatedProperties;
const collectEvaluatedItems = Validation.collectEvaluatedItems;

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
