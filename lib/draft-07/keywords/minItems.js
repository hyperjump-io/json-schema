const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (minItems, json) => {
  const value = Instance.value(json);
  return !Array.isArray(value) || value.length >= minItems;
};

module.exports = { compile, interpret };
