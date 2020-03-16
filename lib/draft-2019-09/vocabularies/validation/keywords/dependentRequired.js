const { Schema, Json } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");
const { isObject } = require("../../../../common");


const compile = (schema) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([key, dependentRequired]) => [key, await Schema.value(await dependentRequired)]),
  Pact.all
], schema);

const interpret = (dependentRequired, json) => {
  const value = Json.value(json);

  return !isObject(value) || dependentRequired.every(([propertyName, required]) => {
    return !(propertyName in value) || required.every((key) => key in value);
  });
};

module.exports = { compile, interpret };
