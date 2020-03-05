const Core = require("../../../core");
const Json = require("../../../json");
const Schema = require("../../../schema");


const compile = async (schema, ast) => {
  const result = {};
  result.contains = await Core.compileSchema(schema, ast);

  try {
    const minContainsSchema = await Schema.sibling("minContains", schema);
    result.minContains = Schema.value(minContainsSchema);
  } catch (error) {
    result.minContains = 1;
  }

  try {
    const maxContainsSchema = await Schema.sibling("maxContains", schema);
    result.maxContains = Schema.value(maxContainsSchema);
  } catch (error) {
    result.maxContains = Number.MAX_SAFE_INTEGER;
  }

  return result;
};

const interpret = ({ contains, minContains, maxContains }, json, ast) => {
  const value = Json.value(json);
  if (!Array.isArray(value)) {
    return true;
  }

  const matches = Json.reduce((matches, item) => {
    return Core.interpretSchema(contains, item, ast) ? matches + 1 : matches;
  }, 0, json);
  return matches >= minContains && matches <= maxContains;
};

module.exports = { compile, interpret };
