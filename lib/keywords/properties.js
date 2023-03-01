import * as Pact from "@hyperjump/pact";
import * as Schema from "../schema.js";
import * as Instance from "../instance.js";
import Validation from "./validation.js";


const id = "https://json-schema.org/keyword/properties";

const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.reduce(async (acc, [propertyName, propertySchema]) => {
    acc[propertyName] = await Validation.compile(propertySchema, ast);
    return acc;
  }, Object.create(null))
], schema);

const interpret = (properties, instance, ast, dynamicAnchors, quiet) => {
  return !Instance.typeOf(instance, "object") || Instance.entries(instance)
    .filter(([propertyName]) => propertyName in properties)
    .every(([propertyName, schemaUrl]) => Validation.interpret(properties[propertyName], schemaUrl, ast, dynamicAnchors, quiet));
};

const collectEvaluatedProperties = (properties, instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "object")) {
    return false;
  }

  const evaluatedPropertyNames = new Set();
  for (const [propertyName, property] of Instance.entries(instance)) {
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
