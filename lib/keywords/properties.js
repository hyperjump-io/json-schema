import { pipe, asyncMap, asyncCollectObject } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/properties";
const description = `Validation succeeds if, for each name that appears in both the \
instance and as a name within this keyword’s value, the child instance for that name \
successfully validates against the corresponding schema.`;

const compile = (schema, ast) => pipe(
  Browser.entries(schema),
  asyncMap(async ([propertyName, propertySchema]) => [propertyName, await Validation.compile(propertySchema, ast)]),
  asyncCollectObject
);

const interpret = (properties, instance, ast, dynamicAnchors, quiet) => {
  if (instance.typeOf() !== "object") {
    return true;
  }

  let isValid = true;
  for (const [propertyName, property] of instance.entries()) {
    if (propertyName.value() in properties && !Validation.interpret(properties[propertyName.value()], property, ast, dynamicAnchors, quiet)) {
      isValid = false;
    }
  }

  return isValid;
};

const collectEvaluatedProperties = (properties, instance, ast, dynamicAnchors) => {
  if (instance.typeOf() !== "object") {
    return false;
  }

  const evaluatedPropertyNames = new Set();
  for (const [propertyName, property] of instance.entries()) {
    if (propertyName.value() in properties) {
      if (!Validation.interpret(properties[propertyName.value()], property, ast, dynamicAnchors, true)) {
        return false;
      }

      evaluatedPropertyNames.add(propertyName.value());
    }
  }

  return evaluatedPropertyNames;
};

export default { id, compile, interpret, collectEvaluatedProperties, description };
