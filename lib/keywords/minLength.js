const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/minLength";

const compile = (schema) => Schema.value(schema);
const interpret = (minLength, instance) => !Instance.typeOf(instance, "string") || [...Instance.value(instance)].length >= minLength;

module.exports = { id, compile, interpret };
