import * as Instance from "../lib/instance.js";
import * as Schema from "../lib/schema.js";
import Validation from "../lib/keywords/validation.js";
import * as Pact from "@hyperjump/pact";


const id = "https://json-schema.org/keyword/draft-04/dependencies";

const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([key, dependency]) => {
    return [key, Schema.typeOf(dependency, "array") ? Schema.value(dependency) : await Validation.compile(dependency, ast)];
  }),
  Pact.all
], schema);

const interpret = (dependencies, instance, ast, dynamicAnchors, quiet) => {
  const value = Instance.value(instance);

  return !Instance.typeOf(instance, "object") || dependencies.every(([propertyName, dependency]) => {
    if (!(propertyName in value)) {
      return true;
    }

    if (Array.isArray(dependency)) {
      return dependency.every((key) => key in value);
    } else {
      return Validation.interpret(dependency, instance, ast, dynamicAnchors, quiet);
    }
  });
};

export default { id, compile, interpret };
