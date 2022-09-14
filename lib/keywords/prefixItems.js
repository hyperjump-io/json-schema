const Pact = require("@hyperjump/pact");
const Instance = require("../instance");
const Schema = require("../schema");
const Validate = require("./validate");


const id = "https://json-schema.org/keyword/prefixItems";

const compile = (schema, ast) => {
  return Pact.pipeline([
    Schema.map((itemSchema) => Validate.compile(itemSchema, ast)),
    Pact.all
  ], schema);
};

const interpret = (items, instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  return Instance.every((item, ndx) => !(ndx in items) || Validate.interpret(items[ndx], item, ast, dynamicAnchors), instance);
};

const collectEvaluatedItems = (items, instance, ast, dynamicAnchors) => {
  return interpret(items, instance, ast, dynamicAnchors) && new Set(items.map((item, ndx) => ndx));
};

module.exports = { id, compile, interpret, collectEvaluatedItems };
