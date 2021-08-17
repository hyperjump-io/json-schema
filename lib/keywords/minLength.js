const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);
const interpret = (minLength, instance) => !Instance.typeOf(instance, "string") || Instance.length(instance) >= minLength;

module.exports = { compile, interpret };
