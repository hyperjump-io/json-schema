const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (minLength, instance) => {
  const value = Instance.value(instance);
  return typeof value !== "string" || value.length >= minLength;
};

module.exports = { compile, interpret };
