const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");
const { escapeRegExp } = require("../common");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.reduce(async (acc, [propertyName, propertySchema]) => {
    acc[propertyName] = await Core.compileSchema(propertySchema, ast);
    return acc;
  }, Object.create(null))
], schema);

const interpret = (properties, instance, ast) => {
  return !Instance.typeOf(instance, "object") || Instance.entries(instance)
    .filter(([propertyName]) => propertyName in properties)
    .every(([propertyName, schemaUrl]) => Core.interpretSchema(properties[propertyName], schemaUrl, ast));
};

const collectEvaluatedProperties = (properties, instance, ast) => {
  return interpret(properties, instance, ast) && Object.keys(properties)
    .map((propertyName) => new RegExp(`^${escapeRegExp(propertyName)}$`));
};

module.exports = { compile, interpret, collectEvaluatedProperties };
