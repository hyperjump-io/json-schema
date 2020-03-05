const Pact = require("@hyperjump/pact");
const Core = require("../../../core");
const Schema = require("../../../schema");
const Json = require("../../../json");
const { isObject } = require("../../../common");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([key, dependentSchema]) => [key, await Core.compileSchema(await dependentSchema, ast)]),
  Pact.all
], schema);

const interpret = (dependentSchemas, json, ast) => {
  const value = Json.value(json);

  return !isObject(value) || dependentSchemas.every(([propertyName, dependentSchema]) => {
    return !(propertyName in value) || Core.interpretSchema(dependentSchema, json, ast);
  });
};

module.exports = { compile, interpret };
