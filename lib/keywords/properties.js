const Pact = require("@hyperjump/pact");
const Schema = require("../schema");
const Instance = require("../instance");
const Validate = require("./validate");


const id = "https://json-schema.org/keyword/properties";

const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.reduce(async (acc, [propertyName, propertySchema]) => {
    acc[propertyName] = await Validate.compile(propertySchema, ast);
    return acc;
  }, Object.create(null))
], schema);

const interpret = (properties, instance, ast, dynamicAnchors) => {
  return !Instance.typeOf(instance, "object") || Instance.entries(instance)
    .filter(([propertyName]) => propertyName in properties)
    .every(([propertyName, schemaUrl]) => Validate.interpret(properties[propertyName], schemaUrl, ast, dynamicAnchors));
};

const collectEvaluatedProperties = (properties, instance, ast, dynamicAnchors) => {
  return interpret(properties, instance, ast, dynamicAnchors) && Object.keys(properties)
    .map((propertyName) => new RegExp(`^${escapeRegExp(propertyName)}$`));
};

const escapeRegExp = (string) => string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");

module.exports = { id, compile, interpret, collectEvaluatedProperties };
