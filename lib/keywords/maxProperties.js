const { Schema, Instance } = require("@hyperjump/json-schema-core");
const { isObject } = require("../common");


const compile = (schema) => Schema.value(schema);

const interpret = (maxProperties, instance) => {
  const value = Instance.value(instance);
  return !isObject(value) || Object.keys(value).length <= maxProperties;
};

module.exports = { compile, interpret };
