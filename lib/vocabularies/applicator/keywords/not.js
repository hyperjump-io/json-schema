const Core = require("../../../core");


const compile = (schema, ast) => Core.compileSchema(schema, ast);
const interpret = (not, json, ast) => !Core.interpretSchema(not, json, ast);

module.exports = { compile, interpret };
