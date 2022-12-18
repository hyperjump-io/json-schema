import * as Instance from "../lib/instance.js";
import Validate from "../lib/keywords/validate.js";


const id = "https://json-schema.org/keyword/draft-06/contains";

const compile = (schema, ast) => Validate.compile(schema, ast);

const interpret = (contains, instance, ast, dynamicAnchors) => {
  return !Instance.typeOf(instance, "array") || Instance.some((item) => Validate.interpret(contains, item, ast, dynamicAnchors), instance);
};

export default { id, compile, interpret };
