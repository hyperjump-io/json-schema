const { Schema, Json } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (minLength, json) => {
  const value = Json.value(json);
  return typeof value !== "string" || [...value].length >= minLength;
};

module.exports = { compile, interpret };
