const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema) => Schema.value(schema);

const interpret = (exclusiveMaximum, instance) => {
  return !Instance.typeOf(instance, "number") || typeof exclusiveMaximum === "boolean" || Instance.value(instance) < exclusiveMaximum;
};

module.exports = { compile, interpret };
