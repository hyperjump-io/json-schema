import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import { Validation } from "../lib/experimental.js";


const id = "https://json-schema.org/keyword/draft-04/dependencies";

const compile = (schema, ast) => pipe(
  Browser.entries(schema),
  asyncMap(async ([key, dependency]) => [
    key,
    Browser.typeOf(dependency) === "array" ? Browser.value(dependency) : await Validation.compile(dependency, ast)
  ]),
  asyncCollectArray
);

const interpret = (dependencies, instance, ast, dynamicAnchors, quiet) => {
  const value = instance.value();

  return instance.typeOf() !== "object" || dependencies.every(([propertyName, dependency]) => {
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
