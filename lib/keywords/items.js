const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => {
  if (Array.isArray(Schema.value(schema))) {
    return Pact.pipeline([
      Schema.map((itemSchema) => Core.compileSchema(itemSchema, ast)),
      Pact.all
    ], schema);
  } else {
    return Core.compileSchema(schema, ast);
  }
};

const interpret = (items, instance, ast) => {
  const value = Instance.value(instance);
  if (!Array.isArray(value)) {
    return true;
  }

  if (typeof items === "string") {
    return Instance.every((itemValue) => Core.interpretSchema(items, itemValue, ast), instance);
  } else {
    return Instance.every((item, ndx) => !(ndx in items) || Core.interpretSchema(items[ndx], item, ast), instance);
  }
};

const collectEvaluatedItems = (items, instance, ast) => {
  return interpret(items, instance, ast) && (typeof items === "string" ? Number.MAX_SAFE_INTEGER : items.length);
};

module.exports = { compile, interpret, collectEvaluatedItems };
