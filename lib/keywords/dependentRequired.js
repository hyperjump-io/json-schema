const Pact = require("@hyperjump/pact");
const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/dependentRequired";

const compile = (schema) => Pact.pipeline([
  Schema.entries,
  Pact.map(([key, dependentRequired]) => [key, Schema.value(dependentRequired)]),
  Pact.all
], schema);

const interpret = (dependentRequired, instance) => {
  const value = Instance.value(instance);

  return !Instance.typeOf(instance, "object") || dependentRequired.every(([propertyName, required]) => {
    return !(propertyName in value) || required.every((key) => key in value);
  });
};

module.exports = { id, compile, interpret };
