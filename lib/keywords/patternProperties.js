const Pact = require("@hyperjump/pact");
const Core = require("../core");
const { isObject } = require("../common");
const Json = require("../json");
const Schema = require("../schema");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([pattern, propertySchema]) => [
    new RegExp(pattern),
    await Core.compileSchema(await propertySchema, ast)
  ]),
  Pact.all
], schema);

const interpret = (patternProperties, json, ast, results) => {
  const value = Json.value(json);
  return !isObject(value) || patternProperties.every(([pattern, propertySchema]) => {
    return Json.entries(json)
      .filter(([propertyName]) => pattern.test(propertyName))
      .every(([, propertyValue]) => Core.interpretSchema(propertySchema, propertyValue, ast, results));
  });
};

module.exports = { compile, interpret };
