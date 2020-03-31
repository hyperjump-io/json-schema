const { JsonSchema } = require("@hyperjump/json-schema-core");


const compile = JsonSchema.compileSchema;
const interpret = (not, instance, ast) => !JsonSchema.interpretSchema(not, instance, ast);

module.exports = { compile, interpret };
