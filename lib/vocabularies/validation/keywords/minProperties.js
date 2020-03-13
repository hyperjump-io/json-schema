const { Schema, Json } = require("@hyperjump/json-schema-core");
const { isObject } = require("../../../common");


const compile = (schema) => Schema.value(schema);

const interpret = (minProperties, json) => {
  const value = Json.value(json);
  return !isObject(value) || Object.keys(value).length >= minProperties;
};

module.exports = { compile, interpret };
