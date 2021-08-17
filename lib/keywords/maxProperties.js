const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);
const interpret = (maxProperties, instance) => !Instance.typeOf(instance, "object") || Instance.keys(instance).length <= maxProperties;

module.exports = { compile, interpret };
