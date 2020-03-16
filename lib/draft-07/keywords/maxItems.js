const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (maxItems, json) => {
  const value = Instance.value(json);
  return !Array.isArray(value) || value.length <= maxItems;
};

module.exports = { compile, interpret };
