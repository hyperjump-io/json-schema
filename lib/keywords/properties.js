const { JsonSchema, Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");
const { isObject } = require("../common");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.reduce(async (acc, [propertyName, propertySchema]) => {
    acc[propertyName] = await JsonSchema.compileSchema(await propertySchema, ast);
    return acc;
  }, {})
], schema);

const interpret = (properties, instance, ast) => {
  return !isObject(Instance.value(instance)) || Instance.entries(instance)
    .filter(([propertyName]) => propertyName in properties)
    .every(([propertyName, propertyValue]) => JsonSchema.interpretSchema(properties[propertyName], propertyValue, ast));
};

module.exports = { compile, interpret };
