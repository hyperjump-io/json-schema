const { Core, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema, ast) => Core.compileSchema(schema, ast);

const interpret = (propertyNames, instance, ast) => {
  return !Instance.typeOf(instance, "object") || Instance.keys(instance)
    .every((key) => Core.interpretSchema(propertyNames, Instance.cons(key), ast));
};

module.exports = { compile, interpret };
