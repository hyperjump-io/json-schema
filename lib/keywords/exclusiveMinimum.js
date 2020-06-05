const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema) => Schema.value(schema);
const interpret = (exclusiveMinimum, instance) => !Instance.typeOf(instance, "number") || Instance.value(instance) > exclusiveMinimum;

module.exports = { compile, interpret };
