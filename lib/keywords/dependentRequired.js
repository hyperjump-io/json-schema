const { Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");
const { isObject } = require("../common");


const compile = (schema) => Pact.pipeline([
  Schema.entries,
  Pact.map(([key, dependentRequired]) => [key, Schema.value(dependentRequired)]),
  Pact.all
], schema);

const interpret = (dependentRequired, instance) => {
  const value = Instance.value(instance);

  return !isObject(value) || dependentRequired.every(([propertyName, required]) => {
    return !(propertyName in value) || required.every((key) => key in value);
  });
};

module.exports = { compile, interpret };
