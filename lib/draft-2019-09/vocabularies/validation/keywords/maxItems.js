const { Schema, Json } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (maxItems, json) => {
  const value = Json.value(json);
  return !Array.isArray(value) || value.length <= maxItems;
};

module.exports = { compile, interpret };
