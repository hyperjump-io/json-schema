const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema) => Schema.value(schema);

const interpret = (maximum, instance) => {
  const value = Instance.value(instance);
  return typeof value !== "number" || value <= maximum;
};

module.exports = { compile, interpret };
