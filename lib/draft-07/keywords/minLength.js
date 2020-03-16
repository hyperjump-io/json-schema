const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (minLength, json) => {
  const value = Instance.value(json);
  return typeof value !== "string" || [...value].length >= minLength;
};

module.exports = { compile, interpret };
