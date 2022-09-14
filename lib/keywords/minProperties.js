const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/minProperties";

const compile = (schema) => Schema.value(schema);
const interpret = (minProperties, instance) => !Instance.typeOf(instance, "object") || Instance.keys(instance).length >= minProperties;

module.exports = { id, compile, interpret };
