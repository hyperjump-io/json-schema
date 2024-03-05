import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/propertyNames";

const compile = (schema, ast) => Validation.compile(schema, ast);

const interpret = (propertyNames, instance, ast, dynamicAnchors) => {
  if (instance.typeOf() !== "object") {
    return true;
  }

  let isValid = true;
  for (const key of instance.keys()) {
    if (!Validation.interpret(propertyNames, key, ast, dynamicAnchors, true)) {
      isValid = false;
    }
  }

  return isValid;
};

export default { id, compile, interpret };
