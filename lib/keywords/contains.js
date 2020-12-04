const { Core, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema, ast) => Core.compileSchema(schema, ast);

const interpret = (contains, instance, ast, dynamicAnchors) => {
  return !Instance.typeOf(instance, "array") || Instance.some((item) => Core.interpretSchema(contains, item, ast, dynamicAnchors), instance);
};

module.exports = { compile, interpret };
