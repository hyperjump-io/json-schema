const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/minimum";

const compile = async (schema) => Schema.value(schema);
const interpret = (minimum, instance) => !Instance.typeOf(instance, "number") || Instance.value(instance) >= minimum;

module.exports = { id, compile, interpret };
