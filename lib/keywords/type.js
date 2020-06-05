const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);
const interpret = (type, instance) => typeof type === "string" ? Instance.typeOf(instance, type) : type.some(Instance.typeOf(instance));

module.exports = { compile, interpret };
