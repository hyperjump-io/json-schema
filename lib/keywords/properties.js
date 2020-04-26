const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");
const { isObject, escapeRegExp } = require("../common");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.reduce(async (acc, entry) => {
    const [propertyName, propertySchema] = await entry;
    acc[propertyName] = await Core.compileSchema(propertySchema, ast);
    return acc;
  }, {})
], schema);

const interpret = (properties, instance, ast) => {
  return !isObject(Instance.value(instance)) || Instance.entries(instance)
    .filter(([propertyName]) => propertyName in properties)
    .every(([propertyName, schemaUrl]) => Core.interpretSchema(properties[propertyName], schemaUrl, ast));
};

const collectEvaluatedProperties = (properties, instance, ast) => {
  return interpret(properties, instance, ast) && Object.keys(properties)
    .map((propertyName) => new RegExp(`^${escapeRegExp(propertyName)}$`));
};

module.exports = { compile, interpret, collectEvaluatedProperties };
