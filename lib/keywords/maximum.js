const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema) => Schema.value(schema);
const interpret = (maximum, instance) => !Instance.typeOf(instance, "number") || Instance.value(instance) <= maximum;

module.exports = { compile, interpret };
