const { Schema, Json } = require("@hyperjump/json-schema-core");
const { isObject } = require("../../../common");


const compile = (schema) => Schema.value(schema);

const interpret = (maxProperties, json) => {
  const value = Json.value(json);
  return !isObject(value) || Object.keys(value).length <= maxProperties;
};

module.exports = { compile, interpret };
