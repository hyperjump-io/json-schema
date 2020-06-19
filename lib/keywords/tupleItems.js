const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => {
  return Pact.pipeline([
    Schema.map((itemSchema) => Core.compileSchema(itemSchema, ast)),
    Pact.all
  ], schema);
};

const interpret = (items, instance, ast) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  return Instance.every((item, ndx) => !(ndx in items) || Core.interpretSchema(items[ndx], item, ast), instance);
};

const collectEvaluatedItems = (items, instance, ast) => interpret(items, instance, ast) && items.length;

module.exports = { compile, interpret, collectEvaluatedItems };
