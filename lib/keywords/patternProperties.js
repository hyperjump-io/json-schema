const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");
const { isObject } = require("../common");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([pattern, propertySchema]) => [
    new RegExp(pattern),
    await Core.compileSchema(await propertySchema, ast)
  ]),
  Pact.all
], schema);

const interpret = (patternProperties, instance, ast) => {
  const value = Instance.value(instance);
  return !isObject(value) || patternProperties.every(([pattern, schemaUrl]) => {
    return Instance.entries(instance)
      .filter(([propertyName]) => pattern.test(propertyName))
      .every(([, propertyValue]) => Core.interpretSchema(schemaUrl, propertyValue, ast));
  });
};

module.exports = { compile, interpret };
