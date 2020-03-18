const { JsonSchema } = require("@hyperjump/json-schema-core");


const compile = (schema, ast) => JsonSchema.compileSchema(schema, ast);
const interpret = (not, instance, ast) => !JsonSchema.interpretSchema(not, instance, ast);

module.exports = { compile, interpret };
