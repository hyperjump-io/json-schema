import { every } from "@hyperjump/pact";
import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/propertyNames";

const compile = (schema, ast) => Validation.compile(schema, ast);

const interpret = (propertyNames, instance, ast, dynamicAnchors) => {
  return instance.typeOf() !== "object" || every((key) => {
    return Validation.interpret(propertyNames, key, ast, dynamicAnchors, true);
  }, instance.keys());
};

export default { id, compile, interpret };
