const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema) => Schema.value(schema);

const interpret = (minimum, json) => {
  const value = Instance.value(json);
  return typeof value !== "number" || value > minimum;
};

module.exports = { compile, interpret };
