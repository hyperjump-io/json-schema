const Validate = require("./validate");


const id = "https://json-schema.org/keyword/if";

const compile = (schema, ast) => Validate.compile(schema, ast);

const interpret = (ifSchema, instance, ast, dynamicAnchors) => {
  Validate.interpret(ifSchema, instance, ast, dynamicAnchors);
  return true;
};

const collectEvaluatedProperties = (ifSchema, instance, ast, dynamicAnchors) => {
  return Validate.collectEvaluatedProperties(ifSchema, instance, ast, dynamicAnchors) || [];
};

const collectEvaluatedItems = (ifSchema, instance, ast, dynamicAnchors) => {
  return Validate.collectEvaluatedItems(ifSchema, instance, ast, dynamicAnchors) || new Set();
};

module.exports = { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
