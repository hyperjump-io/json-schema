const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema) => Schema.value(schema);

const interpret = (exclusiveMinimum, instance) => {
  return !Instance.typeOf(instance, "number") || typeof exclusiveMinimum === "boolean" || Instance.value(instance) > exclusiveMinimum;
};

module.exports = { compile, interpret };
