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
  if (!Array.isArray(Instance.value(instance))) {
    return true;
  }

  if (typeof items === "string") {
    return Instance.every((itemValue) => Core.interpretSchema(items, itemValue, ast), instance);
  } else {
    return Instance.every((item, ndx) => !(ndx in items) || Core.interpretSchema(items[ndx], item, ast), instance);
  }
};

module.exports = { compile, interpret };
