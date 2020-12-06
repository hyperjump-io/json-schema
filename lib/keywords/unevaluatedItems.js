const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  return [Schema.uri(parentSchema), await Core.compileSchema(schema, ast)];
};

const interpret = ([schemaUrl, unevaluatedItems], instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  const itemIndexes = Core.collectEvaluatedItems(schemaUrl, instance, ast, dynamicAnchors, true);
  return itemIndexes === false || Instance.every((item, itemIndex) => {
    return itemIndexes.has(itemIndex) || Core.interpretSchema(unevaluatedItems, Instance.step(itemIndex, instance), ast, dynamicAnchors);
  }, instance);
};

const collectEvaluatedItems = (keywordValue, instance, ast, dynamicAnchors) => {
  return interpret(keywordValue, instance, ast, dynamicAnchors) && new Set(Instance.map((item, ndx) => ndx, instance));
};

module.exports = { compile, interpret, collectEvaluatedItems };
