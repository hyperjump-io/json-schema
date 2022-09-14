const jsonStringify = require("fastest-stable-stringify");
const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/enum";

const compile = (schema) => Schema.value(schema).map(jsonStringify);
const interpret = (enum_, instance) => enum_.some((enumValue) => jsonStringify(Instance.value(instance)) === enumValue);

module.exports = { id, compile, interpret };
