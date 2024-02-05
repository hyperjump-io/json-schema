import { pipe, asyncMap, asyncCollectObject, filter, every } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/properties";

const compile = (schema, ast) => pipe(
  Browser.entries(schema),
  asyncMap(async ([propertyName, propertySchema]) => [propertyName, await Validation.compile(propertySchema, ast)]),
  asyncCollectObject
);

const interpret = (properties, instance, ast, dynamicAnchors, quiet) => {
  return instance.typeOf() !== "object" || pipe(
    instance.entries(),
    filter(([propertyName]) => propertyName in properties),
    every(([propertyName, property]) => Validation.interpret(properties[propertyName], property, ast, dynamicAnchors, quiet))
  );
};

const collectEvaluatedProperties = (properties, instance, ast, dynamicAnchors) => {
  if (instance.typeOf() !== "object") {
    return false;
  }

  const evaluatedPropertyNames = new Set();
  for (const [propertyName, property] of instance.entries()) {
    if (propertyName in properties) {
      if (!Validation.interpret(properties[propertyName], property, ast, dynamicAnchors, true)) {
        return false;
      }

      evaluatedPropertyNames.add(propertyName);
    }
  }

  return evaluatedPropertyNames;
};

export default { id, compile, interpret, collectEvaluatedProperties };
