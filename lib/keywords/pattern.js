const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/pattern";

const compile = (schema) => new RegExp(Schema.value(schema), "u");
const interpret = (pattern, instance) => !Instance.typeOf(instance, "string") || pattern.test(Instance.value(instance));

module.exports = { id, compile, interpret };
