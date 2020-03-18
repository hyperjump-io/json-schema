const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => Pact.pipeline([
  Schema.map(async (itemSchema) => JsonSchema.compileSchema(await itemSchema, ast)),
  Pact.all
], schema);

const interpret = (anyOf, instance, ast) => anyOf.some((schemaUrl) => JsonSchema.interpretSchema(schemaUrl, instance, ast));

module.exports = { compile, interpret };
