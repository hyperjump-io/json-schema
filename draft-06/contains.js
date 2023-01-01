import * as Instance from "../lib/instance.js";
import Validation from "../lib/keywords/validation.js";


const id = "https://json-schema.org/keyword/draft-06/contains";

const compile = (schema, ast) => Validation.compile(schema, ast);

const interpret = (contains, instance, ast, dynamicAnchors) => {
  return !Instance.typeOf(instance, "array") || Instance.some((item) => Validation.interpret(contains, item, ast, dynamicAnchors), instance);
};

export default { id, compile, interpret };
