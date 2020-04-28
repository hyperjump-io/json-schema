const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");
const { isObject } = require("../common");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([pattern, propertySchema]) => [new RegExp(pattern), await Core.compileSchema(propertySchema, ast)]),
  Pact.all
], schema);

const interpret = (patternProperties, instance, ast) => {
  const value = Instance.value(instance);
  return !isObject(value) || patternProperties.every(([pattern, schemaUrl]) => {
    return Instance.entries(instance)
      .filter(([propertyName]) => pattern.test(propertyName))
      .every(([, propertyValue]) => Core.interpretSchema(schemaUrl, propertyValue, ast));
  });
};

const collectEvaluatedProperties = (patternProperties, instance, ast) => {
  return interpret(patternProperties, instance, ast) && patternProperties.map(([pattern]) => pattern);
};

module.exports = { compile, interpret, collectEvaluatedProperties };
