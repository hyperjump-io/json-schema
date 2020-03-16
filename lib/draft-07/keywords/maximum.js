const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema) => Schema.value(schema);

const interpret = (maximum, json) => {
  const value = Instance.value(json);
  return typeof value !== "number" || value <= maximum;
};

module.exports = { compile, interpret };
