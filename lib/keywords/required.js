const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (required, instance) => {
  return !Instance.typeOf(instance, "object") || required.every((propertyName) => Instance.value(instance).hasOwnProperty(propertyName));
};

module.exports = { compile, interpret };
