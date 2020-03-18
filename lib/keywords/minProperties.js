const { Schema, Instance } = require("@hyperjump/json-schema-core");
const { isObject } = require("../common");


const compile = (schema) => Schema.value(schema);

const interpret = (minProperties, instance) => {
  const value = Instance.value(instance);
  return !isObject(value) || Object.keys(value).length >= minProperties;
};

module.exports = { compile, interpret };
