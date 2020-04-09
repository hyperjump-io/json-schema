const { Core, Schema } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => Pact.pipeline([
  Schema.map(async (itemSchema) => Core.compileSchema(await itemSchema, ast)),
  Pact.all
], schema);

const interpret = (allOf, instance, ast) => allOf.every((schemaUrl) => Core.interpretSchema(schemaUrl, instance, ast));

module.exports = { compile, interpret };
