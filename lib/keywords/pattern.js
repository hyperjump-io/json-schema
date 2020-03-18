const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => new RegExp(Schema.value(schema));

const interpret = (pattern, instance) => {
  const value = Instance.value(instance);
  return typeof value !== "string" || pattern.test(value);
};

module.exports = { compile, interpret };
