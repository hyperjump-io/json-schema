import * as Pact from "@hyperjump/pact";
import * as Schema from "../schema.js";
import * as Instance from "../instance.js";
import Validation from "./validation.js";


const id = "https://json-schema.org/keyword/patternProperties";

const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([pattern, propertySchema]) => [new RegExp(pattern, "u"), await Validation.compile(propertySchema, ast)]),
  Pact.all
], schema);

const interpret = (patternProperties, instance, ast, dynamicAnchors, quiet) => {
  return !Instance.typeOf(instance, "object") || patternProperties.every(([pattern, schemaUrl]) => {
    return Instance.entries(instance)
      .filter(([propertyName]) => pattern.test(propertyName))
      .every(([, propertyValue]) => Validation.interpret(schemaUrl, propertyValue, ast, dynamicAnchors, quiet));
  });
};

const collectEvaluatedProperties = (patternProperties, instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "object")) {
    return false;
  }

  const evaluatedPropertyNames = new Set();
  for (const [pattern, propertySchema] of patternProperties) {
    for (const [propertyName, property] of Instance.entries(instance)) {
      if (pattern.test(propertyName)) {
        if (!Validation.interpret(propertySchema, property, ast, dynamicAnchors, true)) {
          return false;
        }

        evaluatedPropertyNames.add(propertyName);
      }
    }
  }

  return evaluatedPropertyNames;
};

export default { id, compile, interpret, collectEvaluatedProperties };
