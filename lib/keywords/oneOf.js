const { Core, Schema } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => Pact.pipeline([
  Schema.map(async (itemSchema) => Core.compileSchema(await itemSchema, ast)),
  Pact.all
], schema);

const interpret = (oneOf, instance, ast, dynamicAnchors) => {
  let validCount = 0;
  for (const schemaUrl of oneOf) {
    if (Core.interpretSchema(schemaUrl, instance, ast, dynamicAnchors)) {
      validCount++;
    }

    if (validCount > 1) {
      break;
    }
  }

  return validCount === 1;
};

const collectEvaluatedProperties = (oneOf, instance, ast, dynamicAnchors) => {
  let validCount = 0;
  return oneOf.reduce((acc, schemaUrl) => {
    if (validCount > 1) {
      return false;
    }

    const propertyNames = Core.collectEvaluatedProperties(schemaUrl, instance, ast, dynamicAnchors);
    return propertyNames ? validCount++ === 0 && propertyNames : acc;
  }, false);
};

const collectEvaluatedItems = (oneOf, instance, ast, dynamicAnchors) => {
  let validCount = 0;
  return oneOf.reduce((acc, schemaUrl) => {
    if (validCount > 1) {
      return false;
    }

    const tupleLength = Core.collectEvaluatedItems(schemaUrl, instance, ast, dynamicAnchors);
    return typeof tupleLength === "number" ? validCount++ === 0 && tupleLength : acc;
  }, false);
};

module.exports = { compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
