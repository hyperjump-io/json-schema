const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (maxLength, json) => {
  const value = Instance.value(json);
  return typeof value !== "string" || [...value].length <= maxLength;
};

module.exports = { compile, interpret };
