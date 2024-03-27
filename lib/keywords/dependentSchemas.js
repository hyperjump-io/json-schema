import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/dependentSchemas";

const compile = (schema, ast) => pipe(
  Browser.entries(schema),
  asyncMap(async ([key, dependentSchema]) => [key, await Validation.compile(dependentSchema, ast)]),
  asyncCollectArray
);

const interpret = (dependentSchemas, instance, ast, dynamicAnchors, quiet) => {
  if (instance.typeOf() !== "object") {
    return true;
  }

  let isValid = true;
  for (const [propertyName, dependentSchema] of dependentSchemas) {
    if (instance.has(propertyName) && !Validation.interpret(dependentSchema, instance, ast, dynamicAnchors, quiet)) {
      isValid = false;
    }
  }

  return isValid;
};

const collectEvaluatedProperties = (dependentSchemas, instance, ast, dynamicAnchors) => {
  if (instance.typeOf() !== "object") {
    return false;
  }

  const evaluatedPropertyNames = new Set();
  for (const [propertyName, dependentSchema] of dependentSchemas) {
    if (instance.has(propertyName)) {
      const propertyNames = Validation.collectEvaluatedProperties(dependentSchema, instance, ast, dynamicAnchors);
      if (propertyNames === false) {
        return false;
      }

      propertyNames.forEach(Set.prototype.add.bind(evaluatedPropertyNames));
    }
  }

  return evaluatedPropertyNames;
};

export default { id, compile, interpret, collectEvaluatedProperties };
