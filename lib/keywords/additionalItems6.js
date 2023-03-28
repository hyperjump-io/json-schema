const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  const items = await Schema.step("items", parentSchema);
  const numberOfItems = Schema.typeOf(items, "array") ? Schema.length(items) : Number.MAX_SAFE_INTEGER;

  return [numberOfItems, await Core.compileSchema(schema, ast)];
};

const interpret = ([numberOfItems, additionalItems], instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  return Instance.every((item, ndx) => ndx < numberOfItems || Core.interpretSchema(additionalItems, item, ast, dynamicAnchors), instance);
};

const collectEvaluatedItems = (keywordValue, instance, ast, dynamicAnchors) => {
  if (!interpret(keywordValue, instance, ast, dynamicAnchors)) {
    return false;
  }

  const evaluatedIndexes = new Set();
  for (let ndx = keywordValue[0]; ndx < Instance.length(instance); ndx++) {
    evaluatedIndexes.add(ndx);
  }

  return evaluatedIndexes;
};

module.exports = { compile, interpret, collectEvaluatedItems };
