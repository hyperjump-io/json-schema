const { JsonSchema } = require("@hyperjump/json-schema-core");


const compile = JsonSchema.compileSchema;
const interpret = JsonSchema.interpretSchema;

module.exports = { compile, interpret };
