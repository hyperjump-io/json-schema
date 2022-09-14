const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/maximum";

const compile = async (schema) => Schema.value(schema);
const interpret = (maximum, instance) => !Instance.typeOf(instance, "number") || Instance.value(instance) <= maximum;

module.exports = { id, compile, interpret };
