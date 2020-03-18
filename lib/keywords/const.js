const { Schema, Instance } = require("@hyperjump/json-schema-core");
const jsonStringify = require("fastest-stable-stringify");


const compile = (schema) => jsonStringify(Schema.value(schema));
const interpret = (const_, instance) => jsonStringify(Instance.value(instance)) === const_;

module.exports = { compile, interpret };
