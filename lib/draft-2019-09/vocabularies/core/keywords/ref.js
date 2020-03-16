const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");


const compile = (schema, ast) => JsonSchema.compileSchema(schema, ast);
const interpret = (ref, json, ast) => JsonSchema.interpretSchema(ref, json, ast);

module.exports = { compile, interpret };
