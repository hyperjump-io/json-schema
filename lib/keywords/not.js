const Core = require("../core");


const compile = (schema, ast) => Core.compileSchema(schema, ast);
const interpret = (not, json, ast, results) => !Core.interpretSchema(not, json, ast, results);

module.exports = { compile, interpret };
