const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema) => Schema.value(schema);

const interpret = (minimum, instance) => {
  const value = Instance.value(instance);
  return typeof value !== "number" || value >= minimum;
};

module.exports = { compile, interpret };
