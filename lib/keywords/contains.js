const { JsonSchema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema, ast) => JsonSchema.compileSchema(schema, ast);

const interpret = (contains, instance, ast) => {
  const value = Instance.value(instance);
  return !Array.isArray(value) || Instance.some((item) => JsonSchema.interpretSchema(contains, item, ast), instance);
};

module.exports = { compile, interpret };
