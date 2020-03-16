const { Schema, Json } = require("@hyperjump/json-schema-core");


const compile = async (schema) => Schema.value(schema);

const interpret = (exclusiveMaximum, json) => {
  const value = Json.value(json);
  return typeof value !== "number" || value < exclusiveMaximum;
};

module.exports = { compile, interpret };
