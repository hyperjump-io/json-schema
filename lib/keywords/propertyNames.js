const { Core, Instance } = require("@hyperjump/json-schema-core");
const { isObject } = require("../common");


const compile = (schema, ast) => Core.compileSchema(schema, ast);

const interpret = (propertyNames, instance, ast) => {
  const value = Instance.value(instance);
  return !isObject(value) || Object.keys(value)
    .every((key) => Core.interpretSchema(propertyNames, Instance.cons(key), ast));
};

module.exports = { compile, interpret };
