const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([pattern, propertySchema]) => [new RegExp(pattern, "u"), await Core.compileSchema(propertySchema, ast)]),
  Pact.all
], schema);

const interpret = (patternProperties, instance, ast, dynamicAnchors) => {
  return !Instance.typeOf(instance, "object") || patternProperties.every(([pattern, schemaUrl]) => {
    return Instance.entries(instance)
      .filter(([propertyName]) => pattern.test(propertyName))
      .every(([, propertyValue]) => Core.interpretSchema(schemaUrl, propertyValue, ast, dynamicAnchors));
  });
};

const collectEvaluatedProperties = (patternProperties, instance, ast, dynamicAnchors) => {
  return interpret(patternProperties, instance, ast, dynamicAnchors) && patternProperties.map(([pattern]) => pattern);
};

module.exports = { compile, interpret, collectEvaluatedProperties };
