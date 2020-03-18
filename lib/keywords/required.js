const { Schema, Instance } = require("@hyperjump/json-schema-core");
const { isObject } = require("../common");


const compile = (schema) => Schema.value(schema);
const interpret = (required, instance) => {
  const value = Instance.value(instance);
  return !isObject(value) || required.every((propertyName) => propertyName in value);
};

module.exports = { compile, interpret };
