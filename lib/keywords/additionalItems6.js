const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  const items = await Schema.step("items", parentSchema);
  const numberOfItems = Schema.typeOf(items, "array") ? Schema.length(items) : Number.MAX_SAFE_INTEGER;

  return [numberOfItems, await Core.compileSchema(schema, ast)];
};

const interpret = ([numberOfItems, additionalItems], instance, ast) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  return Instance.every((item, ndx) => ndx < numberOfItems || Core.interpretSchema(additionalItems, item, ast), instance);
};

const collectEvaluatedItems = (keywordValue, instance, ast) => {
  return interpret(keywordValue, instance, ast) && Number.MAX_SAFE_INTEGER;
};

module.exports = { compile, interpret, collectEvaluatedItems };
