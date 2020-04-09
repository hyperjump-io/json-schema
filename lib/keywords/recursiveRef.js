const { Core } = require("@hyperjump/json-schema-core");


const compile = Core.compileSchema;
const interpret = Core.interpretSchema;

module.exports = { compile, interpret };
