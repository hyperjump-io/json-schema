const { JsonSchema, Schema, Json } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");
const { isObject } = require("../../../common");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([pattern, propertySchema]) => [
    new RegExp(pattern),
    await JsonSchema.compileSchema(await propertySchema, ast)
  ]),
  Pact.all
], schema);

const interpret = (patternProperties, json, ast) => {
  const value = Json.value(json);
  return !isObject(value) || patternProperties.every(([pattern, propertySchema]) => {
    return Json.entries(json)
      .filter(([propertyName]) => pattern.test(propertyName))
      .every(([, propertyValue]) => JsonSchema.interpretSchema(propertySchema, propertyValue, ast));
  });
};

module.exports = { compile, interpret };
