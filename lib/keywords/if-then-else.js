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

const interpret = (conditional, instance, ast) => {
  return JsonSchema.interpretSchema(conditional["if"], instance, ast)
    ? ("then" in conditional ? JsonSchema.interpretSchema(conditional["then"], instance, ast) : true)
    : ("else" in conditional ? JsonSchema.interpretSchema(conditional["else"], instance, ast) : true);
};

module.exports = { compile, interpret };
