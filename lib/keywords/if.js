const { Core } = require("@hyperjump/json-schema-core");


const compile = (schema, ast) => Core.compileSchema(schema, ast);

const interpret = (ifSchema, instance, ast, dynamicAnchors) => {
  Core.interpretSchema(ifSchema, instance, ast, dynamicAnchors);
  return true;
};

const collectEvaluatedProperties = (ifSchema, instance, ast, dynamicAnchors) => {
  return Core.collectEvaluatedProperties(ifSchema, instance, ast, dynamicAnchors) || [];
};

const collectEvaluatedItems = (ifSchema, instance, ast, dynamicAnchors) => {
  return Core.collectEvaluatedItems(ifSchema, instance, ast, dynamicAnchors) || new Set();
};

module.exports = { compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
