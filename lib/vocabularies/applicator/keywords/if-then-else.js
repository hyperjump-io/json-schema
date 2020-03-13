const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast) => {
  const result = {};
  result["if"] = await JsonSchema.compileSchema(schema, ast);

  try {
    const thenSchema = await Schema.sibling("then", schema);
    result["then"] = await JsonSchema.compileSchema(thenSchema, ast);
  } catch (error) {}

  try {
    const elseSchema = await Schema.sibling("else", schema);
    result["else"] = await JsonSchema.compileSchema(elseSchema, ast);
  } catch (error) {}

  return result;
};

const interpret = (conditional, json, ast) => {
  return JsonSchema.interpretSchema(conditional["if"], json, ast)
    ? ("then" in conditional ? JsonSchema.interpretSchema(conditional["then"], json, ast) : true)
    : ("else" in conditional ? JsonSchema.interpretSchema(conditional["else"], json, ast) : true);
};

module.exports = { compile, interpret };
