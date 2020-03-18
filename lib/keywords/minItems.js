const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (minItems, instance) => {
  const value = Instance.value(instance);
  return !Array.isArray(value) || value.length >= minItems;
};

module.exports = { compile, interpret };
