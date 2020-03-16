const { JsonSchema, Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => {
  if (Array.isArray(Schema.value(schema))) {
    return Pact.pipeline([
      Schema.map((itemSchema) => JsonSchema.compileSchema(itemSchema, ast)),
      Pact.all
    ], schema);
  } else {
    return JsonSchema.compileSchema(schema, ast);
  }
};

const interpret = (items, json, ast) => {
  if (!Array.isArray(Instance.value(json))) {
    return true;
  }

  if (typeof items === "string") {
    return Instance.every((itemValue) => JsonSchema.interpretSchema(items, itemValue, ast), json);
  } else {
    return Instance.every((item, ndx) => !(ndx in items) || JsonSchema.interpretSchema(items[ndx], item, ast), json);
  }
};

module.exports = { compile, interpret };
