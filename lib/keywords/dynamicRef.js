import * as Schema from "../schema.js";
import Validate from "./validate.js";


const id = "https://json-schema.org/keyword/dynamicRef";
const unstable = true;

const compile = Schema.value;

const interpret = (fragment, instance, ast, dynamicAnchors) => {
  if (!(fragment in dynamicAnchors)) {
    throw Error(`No dynamic anchor found for "${fragment}"`);
  }
  return Validate.interpret(dynamicAnchors[fragment], instance, ast, dynamicAnchors);
};

const collectEvaluatedProperties = Validate.collectEvaluatedProperties;
const collectEvaluatedItems = Validate.collectEvaluatedItems;

export default { id, unstable, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
