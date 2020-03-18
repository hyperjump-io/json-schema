const { JsonSchema } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast) => JsonSchema.compileSchema(schema, ast);
const interpret = (recursiveRef, instance, ast) => JsonSchema.interpretSchema(recursiveRef, instance, ast);

module.exports = { compile, interpret };
