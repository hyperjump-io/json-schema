const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/minItems";

const compile = (schema) => Schema.value(schema);
const interpret = (minItems, instance) => !Instance.typeOf(instance, "array") || Instance.length(instance) >= minItems;

module.exports = { id, compile, interpret };
