const Pact = require("@hyperjump/pact");
const Core = require("../core");
const Schema = require("../schema");


const compile = (schema, ast) => Pact.pipeline([
  Schema.map(async (itemSchema) => Core.compileSchema(await itemSchema, ast)),
  Pact.all
], schema);

const interpret = (allOf, json, ast, results) => allOf.every((schemaUrl) => Core.interpretSchema(schemaUrl, json, ast, results));

module.exports = { compile, interpret };
