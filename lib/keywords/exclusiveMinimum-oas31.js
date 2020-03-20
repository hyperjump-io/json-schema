const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema) => Schema.value(schema);

const interpret = (exclusiveMinimum, instance) => {
  const value = Instance.value(instance);
  return typeof value !== "number" || typeof exclusiveMinimum === "boolean" || value > exclusiveMinimum;
};

module.exports = { compile, interpret };
