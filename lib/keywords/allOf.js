const { Core, Schema } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => Pact.pipeline([
  Schema.map(async (itemSchema) => Core.compileSchema(await itemSchema, ast)),
  Pact.all
], schema);

const interpret = (allOf, instance, ast, dynamicAnchors) => {
  return allOf.every((schemaUrl) => Core.interpretSchema(schemaUrl, instance, ast, dynamicAnchors));
};

const collectEvaluatedProperties = (allOf, instance, ast, dynamicAnchors) => {
  return allOf.reduce((acc, schemaUrl) => {
    const propertyNames = acc && Core.collectEvaluatedProperties(schemaUrl, instance, ast, dynamicAnchors);
    return propertyNames !== false && [...acc, ...propertyNames];
  }, []);
};

const collectEvaluatedItems = (allOf, instance, ast, dynamicAnchors) => {
  return allOf.reduce((acc, schemaUrl) => {
    const itemIndexes = acc !== false && Core.collectEvaluatedItems(schemaUrl, instance, ast, dynamicAnchors);
    return itemIndexes !== false && new Set([...acc, ...itemIndexes]);
  }, new Set());
};

module.exports = { compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
