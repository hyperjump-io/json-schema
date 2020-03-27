const { JsonSchema, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parent) => {
  const result = {};
  result.contains = await JsonSchema.compileSchema(schema, ast);

  try {
    const minContainsSchema = await Schema.step("minContains", parent);
    result.minContains = Schema.value(minContainsSchema);
  } catch (error) {
    result.minContains = 1;
  }

  try {
    const maxContainsSchema = await Schema.step("maxContains", parent);
    result.maxContains = Schema.value(maxContainsSchema);
  } catch (error) {
    result.maxContains = Number.MAX_SAFE_INTEGER;
  }

  return result;
};

const interpret = ({ contains, minContains, maxContains }, json, ast) => {
  const value = Instance.value(json);
  if (!Array.isArray(value)) {
    return true;
  }

  const matches = Instance.reduce((matches, item) => {
    return JsonSchema.interpretSchema(contains, item, ast) ? matches + 1 : matches;
  }, 0, json);
  return matches >= minContains && matches <= maxContains;
};

module.exports = { compile, interpret };
