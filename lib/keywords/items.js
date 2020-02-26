const Pact = require("@hyperjump/pact");
const Core = require("../core");
const Schema = require("../schema");
const Json = require("../json");


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

const interpret = (items, json, ast, results) => {
  if (!Array.isArray(Json.value(json))) {
    return true;
  }

  if (typeof items === "string") {
    return Json.every((itemValue) => Core.interpretSchema(items, itemValue, ast, results), json);
  } else {
    return Json.every((item, ndx) => !(ndx in items) || Core.interpretSchema(items[ndx], item, ast, results), json);
  }
};

module.exports = { compile, interpret };
