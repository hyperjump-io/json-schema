const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  const items = await Schema.step("prefixItems", parentSchema);
  const numberOfPrefixItems = Schema.typeOf(items, "array") ? Schema.length(items) : 0;

  return [numberOfPrefixItems, await Core.compileSchema(schema, ast)];
};

const interpret = ([numberOfPrefixItems, items], instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  return Instance.every((item, ndx) => ndx < numberOfPrefixItems || Core.interpretSchema(items, item, ast, dynamicAnchors), instance);
};

const collectEvaluatedItems = (keywordValue, instance, ast, dynamicAnchors) => {
  return interpret(keywordValue, instance, ast, dynamicAnchors) && new Set(Instance.map((item, ndx) => ndx, instance));
};

module.exports = { compile, interpret, collectEvaluatedItems };
