import * as Instance from "../lib/instance.js";
import { Validation } from "../lib/experimental.js";


const id = "https://json-schema.org/keyword/draft-06/contains";

const compile = (schema, ast) => Validation.compile(schema, ast);

const interpret = (contains, instance, context) => {
  if (Instance.typeOf(instance) !== "array") {
    return true;
  }

  for (const item of Instance.iter(instance)) {
    if (Validation.interpret(contains, item, context)) {
      return true;
    }
  }

  return false;
};

export default { id, compile, interpret };
