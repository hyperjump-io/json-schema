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
    return propertyNames && acc.concat(propertyNames);
  }, []);
};

const collectEvaluatedItems = (items, instance, ast, dynamicAnchors) => {
  return items.reduce((acc, schemaUrl) => {
    const tupleLength = acc !== false && Core.collectEvaluatedItems(schemaUrl, instance, ast, dynamicAnchors);
    return tupleLength !== false && Math.max(acc, tupleLength);
  }, 0);
};

module.exports = { compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
