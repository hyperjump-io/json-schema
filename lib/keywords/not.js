const { Core } = require("@hyperjump/json-schema-core");


const compile = Core.compileSchema;
const interpret = (not, instance, ast) => !Core.interpretSchema(not, instance, ast);

module.exports = { compile, interpret };
