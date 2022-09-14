const Pact = require("@hyperjump/pact");
const Schema = require("../schema");
const Instance = require("../instance");
const Validate = require("./validate");


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

module.exports = { id, compile, interpret, collectEvaluatedProperties };
