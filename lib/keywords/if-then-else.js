const Core = require("../core");
const Schema = require("../schema");


const compile = async (schema, ast) => {
  const result = {};
  result["if"] = await Core.compileSchema(schema, ast);

  try {
    const thenSchema = await Schema.sibling("then", schema);
    result["then"] = await Core.compileSchema(thenSchema, ast);
  } catch (error) {}

  try {
    const elseSchema = await Schema.sibling("else", schema);
    result["else"] = await Core.compileSchema(elseSchema, ast);
  } catch (error) {}

  return result;
};

const interpret = (conditional, json, ast, results) => {
  return Core.interpretSchema(conditional["if"], json, ast, results)
    ? ("then" in conditional ? Core.interpretSchema(conditional["then"], json, ast, results) : true)
    : ("else" in conditional ? Core.interpretSchema(conditional["else"], json, ast, results) : true);
};

module.exports = { compile, interpret };
