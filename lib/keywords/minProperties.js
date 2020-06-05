const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (minProperties, instance) => {
  const value = Instance.value(instance);
  return !Instance.typeOf(instance, "object") || Object.keys(value).length >= minProperties;
};

module.exports = { compile, interpret };
