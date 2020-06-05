const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema) => Schema.value(schema);
const interpret = (minimum, instance) => !Instance.typeOf(instance, "number") || Instance.value(instance) >= minimum;

module.exports = { compile, interpret };
