const { JsonSchema, Schema, Json } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");
const { isObject } = require("../../../common");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([key, dependentSchema]) => [key, await JsonSchema.compileSchema(await dependentSchema, ast)]),
  Pact.all
], schema);

const interpret = (dependentSchemas, json, ast) => {
  const value = Json.value(json);

  return !isObject(value) || dependentSchemas.every(([propertyName, dependentSchema]) => {
    return !(propertyName in value) || JsonSchema.interpretSchema(dependentSchema, json, ast);
  });
};

module.exports = { compile, interpret };
