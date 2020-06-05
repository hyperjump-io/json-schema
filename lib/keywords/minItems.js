const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);
const interpret = (minItems, instance) => !Instance.typeOf(instance, "array") || Instance.length(instance) >= minItems;

module.exports = { compile, interpret };
