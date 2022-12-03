import * as Pact from "@hyperjump/pact";
import * as Schema from "../schema.js";
import * as Instance from "../instance.js";
import Validate from "./validate.js";


const id = "https://json-schema.org/keyword/patternProperties";

const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([pattern, propertySchema]) => [new RegExp(pattern, "u"), await Validate.compile(propertySchema, ast)]),
  Pact.all
], schema);

const interpret = (patternProperties, instance, ast, dynamicAnchors) => {
  return !Instance.typeOf(instance, "object") || patternProperties.every(([pattern, schemaUrl]) => {
    return Instance.entries(instance)
      .filter(([propertyName]) => pattern.test(propertyName))
      .every(([, propertyValue]) => Validate.interpret(schemaUrl, propertyValue, ast, dynamicAnchors));
  });
};

const collectEvaluatedProperties = (patternProperties, instance, ast, dynamicAnchors) => {
  return interpret(patternProperties, instance, ast, dynamicAnchors) && patternProperties.map(([pattern]) => pattern);
};

export default { id, compile, interpret, collectEvaluatedProperties };
