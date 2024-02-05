import { pipe, asyncMap, asyncCollectArray, filter, every } from "@hyperjump/pact";
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
  return instance.typeOf() !== "object" || patternProperties.every(([pattern, schemaUrl]) => {
    return pipe(
      instance.entries(),
      filter(([propertyName]) => pattern.test(propertyName.value())),
      every(([, propertyValue]) => Validation.interpret(schemaUrl, propertyValue, ast, dynamicAnchors, quiet))
    );
  });
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
