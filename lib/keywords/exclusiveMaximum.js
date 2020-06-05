const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema) => Schema.value(schema);
const interpret = (exclusiveMaximum, instance) => !Instance.typeOf(instance, "number") || Instance.value(instance) < exclusiveMaximum;

module.exports = { compile, interpret };
