const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/maxItems";

const compile = (schema) => Schema.value(schema);
const interpret = (maxItems, instance) => !Instance.typeOf(instance, "array") || Instance.length(instance) <= maxItems;

module.exports = { id, compile, interpret };
