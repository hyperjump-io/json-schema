const { Core, Schema } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  const result = {};
  const parentSchemaValue = Schema.value(parentSchema);

  result["if"] = await Core.compileSchema(schema, ast);

  if ("then" in parentSchemaValue) {
    const thenSchema = await Schema.step("then", parentSchema);
    result["then"] = await Core.compileSchema(thenSchema, ast);
  }

  if ("else" in parentSchemaValue) {
    const elseSchema = await Schema.step("else", parentSchema);
    result["else"] = await Core.compileSchema(elseSchema, ast);
  }

  return result;
};

const interpret = (conditional, instance, ast) => {
  return Core.interpretSchema(conditional["if"], instance, ast)
    ? ("then" in conditional ? Core.interpretSchema(conditional["then"], instance, ast) : true)
    : ("else" in conditional ? Core.interpretSchema(conditional["else"], instance, ast) : true);
};

module.exports = { compile, interpret };
