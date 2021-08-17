const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);
const interpret = (minProperties, instance) => !Instance.typeOf(instance, "object") || Instance.keys(instance).length >= minProperties;

module.exports = { compile, interpret };
