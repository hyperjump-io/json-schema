const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");
const { isObject } = require("../common");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([key, dependentSchema]) => [key, await Core.compileSchema(await dependentSchema, ast)]),
  Pact.all
], schema);

const interpret = (dependentSchemas, instance, ast) => {
  const value = Instance.value(instance);

  return !isObject(value) || dependentSchemas.every(([propertyName, dependentSchema]) => {
    return !(propertyName in value) || Core.interpretSchema(dependentSchema, instance, ast);
  });
};

module.exports = { compile, interpret };
