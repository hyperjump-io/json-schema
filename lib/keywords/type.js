const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/type";

const compile = (schema) => Schema.value(schema);
const interpret = (type, instance) => typeof type === "string" ? Instance.typeOf(instance, type) : type.some(Instance.typeOf(instance));

module.exports = { id, compile, interpret };
