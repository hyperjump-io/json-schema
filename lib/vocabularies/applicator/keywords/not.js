const { JsonSchema } = require("@hyperjump/json-schema-core");


const compile = (schema, ast) => JsonSchema.compileSchema(schema, ast); const interpret = (not, json, ast) => !JsonSchema.interpretSchema(not, json, ast);

module.exports = { compile, interpret };
