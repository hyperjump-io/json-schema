const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (maxItems, instance) => {
  const value = Instance.value(instance);
  return !Array.isArray(value) || value.length <= maxItems;
};

module.exports = { compile, interpret };
