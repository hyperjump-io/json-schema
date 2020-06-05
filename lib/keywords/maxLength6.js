const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);
const interpret = (maxLength, instance) => !Instance.typeOf(instance, "string") || [...Instance.value(instance)].length <= maxLength;

module.exports = { compile, interpret };
