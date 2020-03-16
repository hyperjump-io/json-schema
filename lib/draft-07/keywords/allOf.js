const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => Pact.pipeline([
  Schema.map(async (itemSchema) => JsonSchema.compileSchema(await itemSchema, ast)),
  Pact.all
], schema);

const interpret = (allOf, json, ast) => allOf.every((schemaUrl) => JsonSchema.interpretSchema(schemaUrl, json, ast));

module.exports = { compile, interpret };
