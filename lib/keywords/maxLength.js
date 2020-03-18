const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (maxLength, instance) => {
  const value = Instance.value(instance);
  return typeof value !== "string" || value.length <= maxLength;
};

module.exports = { compile, interpret };
