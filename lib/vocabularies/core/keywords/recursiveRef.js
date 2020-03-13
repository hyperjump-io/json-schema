const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast) => JsonSchema.compileSchema(schema, ast);
const interpret = (recursiveRef, json, ast) => JsonSchema.interpretSchema(recursiveRef, json, ast);

module.exports = { compile, interpret };
