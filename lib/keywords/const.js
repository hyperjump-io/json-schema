const jsonStringify = require("fastest-stable-stringify");
const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/const";

const compile = (schema) => jsonStringify(Schema.value(schema));
const interpret = (const_, instance) => jsonStringify(Instance.value(instance)) === const_;

module.exports = { id, compile, interpret };
