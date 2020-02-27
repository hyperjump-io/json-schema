const Pact = require("@hyperjump/pact");
const Core = require("../core");
const Schema = require("../schema");


const compile = (schema, ast) => Pact.pipeline([
  Schema.map(async (itemSchema) => Core.compileSchema(await itemSchema, ast)),
  Pact.all
], schema);

const interpret = (anyOf, json, ast) => anyOf.some((schemaUrl) => Core.interpretSchema(schemaUrl, json, ast));

module.exports = { compile, interpret };
