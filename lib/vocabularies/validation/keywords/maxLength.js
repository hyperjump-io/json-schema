const { Schema, Json } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (maxLength, json) => {
  const value = Json.value(json);
  return typeof value !== "string" || [...value].length <= maxLength;
};

module.exports = { compile, interpret };
