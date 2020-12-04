const { Core } = require("@hyperjump/json-schema-core");


const compile = (schema, ast) => Core.compileSchema(schema, ast);

const interpret = (ifSchema, instance, ast, dynamicAnchors) => {
  Core.interpretSchema(ifSchema, instance, ast, dynamicAnchors);
  return true;
};

module.exports = { compile, interpret };
