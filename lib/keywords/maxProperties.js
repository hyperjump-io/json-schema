const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/maxProperties";

const compile = (schema) => Schema.value(schema);
const interpret = (maxProperties, instance) => !Instance.typeOf(instance, "object") || Instance.keys(instance).length <= maxProperties;

module.exports = { id, compile, interpret };
