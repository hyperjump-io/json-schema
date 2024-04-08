import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import * as Instance from "../lib/instance.js";
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
  const value = Instance.value(instance);

  return Instance.typeOf(instance) !== "object" || dependencies.every(([propertyName, dependency]) => {
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

const description = "If the object values are objects, this keyword specifies subschemas that are evaluated if the instance is an object and contains a certain property. If the object values are arrays, validation succeeds if, for each name that appears in both the instance and as a name within this keyword’s value, every item in the corresponding array is also the name of a property in the instance.";

export default { id, compile, interpret, description };
