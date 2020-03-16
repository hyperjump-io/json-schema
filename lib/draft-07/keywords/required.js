const { Schema, Instance } = require("@hyperjump/json-schema-core");
const { isObject } = require("../../common");


const compile = (schema) => Schema.value(schema);

const interpret = (required, json) => {
  const value = Instance.value(json);
  return !isObject(value) || required.every((propertyName) => propertyName in value);
};

module.exports = { compile, interpret };
