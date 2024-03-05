import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/patternProperties";

const compile = (schema, ast) => pipe(
  Browser.entries(schema),
  asyncMap(async ([pattern, propertySchema]) => [
    new RegExp(pattern, "u"),
    await Validation.compile(propertySchema, ast)
  ]),
  asyncCollectArray
);

const interpret = (patternProperties, instance, ast, dynamicAnchors, quiet) => {
  if (instance.typeOf() !== "object") {
    return true;
  }

  let isValid = true;
  for (const [pattern, schemaUri] of patternProperties) {
    for (const [propertyName, propertyValue] of instance.entries()) {
      if (pattern.test(propertyName.value()) && !Validation.interpret(schemaUri, propertyValue, ast, dynamicAnchors, quiet)) {
        isValid = false;
      }
    }
  }

  return isValid;
};

const collectEvaluatedProperties = (patternProperties, instance, ast, dynamicAnchors) => {
  if (instance.typeOf() !== "object") {
    return false;
  }

  const evaluatedPropertyNames = new Set();
  for (const [pattern, propertySchema] of patternProperties) {
    for (const [propertyName, property] of instance.entries()) {
      if (pattern.test(propertyName.value())) {
        if (!Validation.interpret(propertySchema, property, ast, dynamicAnchors, true)) {
          return false;
        }

        evaluatedPropertyNames.add(propertyName.value());
      }
    }
  }

  return evaluatedPropertyNames;
};

export default { id, compile, interpret, collectEvaluatedProperties };
