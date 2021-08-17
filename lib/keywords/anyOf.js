const { Core, Schema } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => Pact.pipeline([
  Schema.map(async (itemSchema) => Core.compileSchema(await itemSchema, ast)),
  Pact.all
], schema);

const interpret = (anyOf, instance, ast, dynamicAnchors) => {
  const matches = anyOf.filter((schemaUrl) => Core.interpretSchema(schemaUrl, instance, ast, dynamicAnchors));
  return matches.length > 0;
};

const collectEvaluatedProperties = (anyOf, instance, ast, dynamicAnchors) => {
  return anyOf.reduce((acc, schemaUrl) => {
    const propertyNames = Core.collectEvaluatedProperties(schemaUrl, instance, ast, dynamicAnchors);
    return propertyNames !== false ? [...acc || [], ...propertyNames] : acc;
  }, false);
};

const collectEvaluatedItems = (anyOf, instance, ast, dynamicAnchors) => {
  return anyOf.reduce((acc, schemaUrl) => {
    const itemIndexes = Core.collectEvaluatedItems(schemaUrl, instance, ast, dynamicAnchors);
    return itemIndexes !== false ? new Set([...acc || [], ...itemIndexes]) : acc;
  }, false);
};

module.exports = { compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
