const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => {
  if (Schema.typeOf(schema, "array")) {
    return Pact.pipeline([
      Schema.map((itemSchema) => Core.compileSchema(itemSchema, ast)),
      Pact.all
    ], schema);
  } else {
    return Core.compileSchema(schema, ast);
  }
};

const interpret = (items, instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  if (typeof items === "string") {
    return Instance.every((itemValue) => Core.interpretSchema(items, itemValue, ast, dynamicAnchors), instance);
  } else {
    return Instance.every((item, ndx) => !(ndx in items) || Core.interpretSchema(items[ndx], item, ast, dynamicAnchors), instance);
  }
};

const collectEvaluatedItems = (items, instance, ast, dynamicAnchors) => {
  return interpret(items, instance, ast, dynamicAnchors) && (typeof items === "string" ? Number.MAX_SAFE_INTEGER : items.length);
};

module.exports = { compile, interpret, collectEvaluatedItems };
