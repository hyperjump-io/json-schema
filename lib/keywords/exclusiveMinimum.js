const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/exclusiveMinimum";

const compile = async (schema) => Schema.value(schema);
const interpret = (exclusiveMinimum, instance) => !Instance.typeOf(instance, "number") || Instance.value(instance) > exclusiveMinimum;

module.exports = { id, compile, interpret };
