const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  const contains = await Core.compileSchema(schema, ast);

  const minContainsSchema = await Schema.step("minContains", parentSchema);
  const minContains = Schema.value(minContainsSchema) || 1;

  const maxContainsSchema = await Schema.step("maxContains", parentSchema);
  const maxContains = Schema.value(maxContainsSchema) || Number.MAX_SAFE_INTEGER;

  return { contains, minContains, maxContains };
};

const interpret = ({ contains, minContains, maxContains }, json, ast) => {
  const value = Instance.value(json);
  if (!Array.isArray(value)) {
    return true;
  }

  const matches = Instance.reduce((matches, item) => {
    return Core.interpretSchema(contains, item, ast) ? matches + 1 : matches;
  }, 0, json);
  return matches >= minContains && matches <= maxContains;
};

module.exports = { compile, interpret };
