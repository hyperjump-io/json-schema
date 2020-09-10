const { Core, Schema } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => Pact.pipeline([
  Schema.map(async (itemSchema) => Core.compileSchema(await itemSchema, ast)),
  Pact.all
], schema);

const interpret = (anyOf, instance, ast) => {
  const matches = anyOf.filter((schemaUrl) => Core.interpretSchema(schemaUrl, instance, ast));
  return matches.length > 0;
};

const collectEvaluatedProperties = (anyOf, instance, ast) => {
  return anyOf.reduce((acc, schemaUrl) => {
    const propertyNames = Core.collectEvaluatedProperties(schemaUrl, instance, ast);
    return propertyNames ? (acc || []).concat(propertyNames) : acc;
  }, false);
};

const collectEvaluatedItems = (anyOf, instance, ast) => {
  return anyOf.reduce((acc, schemaUrl) => {
    const tupleLength = Core.collectEvaluatedItems(schemaUrl, instance, ast);
    return tupleLength !== false ? Math.max(acc, tupleLength) : acc;
  }, false);
};

module.exports = { compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
