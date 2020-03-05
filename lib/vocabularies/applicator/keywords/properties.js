const Pact = require("@hyperjump/pact");
const Core = require("../../../core");
const Schema = require("../../../schema");
const Json = require("../../../json");
const { isObject } = require("../../../common");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.reduce(async (acc, [propertyName, propertySchema]) => {
    acc[propertyName] = await Core.compileSchema(await propertySchema, ast);
    return acc;
  }, {})
], schema);

const interpret = (properties, json, ast) => {
  return !isObject(Json.value(json)) || Json.entries(json)
    .filter(([propertyName]) => propertyName in properties)
    .every(([propertyName, propertyValue]) => Core.interpretSchema(properties[propertyName], propertyValue, ast));
};

module.exports = { compile, interpret };
