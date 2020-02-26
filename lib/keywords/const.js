const jsonStringify = require("fastest-stable-stringify");
const Schema = require("../schema");
const Json = require("../json");


const compile = (schema) => jsonStringify(Schema.value(schema));
const interpret = (const_, json) => jsonStringify(Json.value(json)) === const_;

module.exports = { compile, interpret };
