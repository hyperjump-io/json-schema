const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);
const interpret = (maxItems, instance) => !Instance.typeOf(instance, "array") || Instance.length(instance) <= maxItems;

module.exports = { compile, interpret };
