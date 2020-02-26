const jsonStringify = require("fastest-stable-stringify");
const Schema = require("../schema");
const Json = require("../json");


const compile = (schema) => Schema.value(schema).map(jsonStringify);
const interpret = (enum_, json) => enum_.some((enumValue) => jsonStringify(Json.value(json)) === enumValue);

module.exports = { compile, interpret };
