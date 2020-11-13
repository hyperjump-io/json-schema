const { Core } = require("@hyperjump/json-schema-core");


const compile = (schema, ast) => Core.compileSchema(schema, ast);

const interpret = (ifSchema, instance, ast) => {
  Core.interpretSchema(ifSchema, instance, ast);
  return true;
};

module.exports = { compile, interpret };
