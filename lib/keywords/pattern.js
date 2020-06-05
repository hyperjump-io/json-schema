const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => new RegExp(Schema.value(schema), "u");
const interpret = (pattern, instance) => !Instance.typeOf(instance, "string") || pattern.test(Instance.value(instance));

module.exports = { compile, interpret };
