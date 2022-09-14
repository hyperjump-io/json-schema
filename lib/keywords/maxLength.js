const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/maxLength";

const compile = (schema) => Schema.value(schema);
const interpret = (maxLength, instance) => !Instance.typeOf(instance, "string") || [...Instance.value(instance)].length <= maxLength;

module.exports = { id, compile, interpret };
