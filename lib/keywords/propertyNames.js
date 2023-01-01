import * as Instance from "../instance.js";
import Validation from "./validation.js";


const id = "https://json-schema.org/keyword/propertyNames";

const compile = (schema, ast) => Validation.compile(schema, ast);

const interpret = (propertyNames, instance, ast, dynamicAnchors) => {
  return !Instance.typeOf(instance, "object") || Instance.keys(instance)
    .every((key) => Validation.interpret(propertyNames, Instance.cons(key), ast, dynamicAnchors));
};

export default { id, compile, interpret };
