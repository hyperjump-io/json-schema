const { Core } = require("@hyperjump/json-schema-core");


const compile = Core.compileSchema;
const interpret = (not, instance, ast, dynamicAnchors) => !Core.interpretSchema(not, instance, ast, dynamicAnchors);

module.exports = { compile, interpret };
