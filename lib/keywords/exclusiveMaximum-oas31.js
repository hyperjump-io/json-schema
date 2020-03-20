const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema) => Schema.value(schema);

const interpret = (exclusiveMaximum, instance) => {
  const value = Instance.value(instance);
  return typeof value !== "number" || typeof exclusiveMaximum === "boolean" || value < exclusiveMaximum;
};

module.exports = { compile, interpret };
