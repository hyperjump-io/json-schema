const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/exclusiveMaximum";

const compile = async (schema) => Schema.value(schema);
const interpret = (exclusiveMaximum, instance) => !Instance.typeOf(instance, "number") || Instance.value(instance) < exclusiveMaximum;

module.exports = { id, compile, interpret };
