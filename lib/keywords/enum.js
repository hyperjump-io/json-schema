const { Schema, Instance } = require("@hyperjump/json-schema-core");
const jsonStringify = require("fastest-stable-stringify");


const compile = (schema) => Schema.value(schema).map(jsonStringify);
const interpret = (enum_, instance) => enum_.some((enumValue) => jsonStringify(Instance.value(instance)) === enumValue);

module.exports = { compile, interpret };
