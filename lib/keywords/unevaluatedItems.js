const Schema = require("../schema");
const Instance = require("../instance");
const Validate = require("./validate");


const id = "https://json-schema.org/keyword/unevaluatedItems";

const compile = async (schema, ast, parentSchema) => {
  return [Schema.uri(parentSchema), await Validate.compile(schema, ast)];
};

const interpret = ([schemaUrl, unevaluatedItems], instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  const itemIndexes = Validate.collectEvaluatedItems(schemaUrl, instance, ast, dynamicAnchors, true);
  return itemIndexes === false || Instance.every((item, itemIndex) => {
    return itemIndexes.has(itemIndex) || Validate.interpret(unevaluatedItems, Instance.step(itemIndex, instance), ast, dynamicAnchors);
  }, instance);
};

const collectEvaluatedItems = (keywordValue, instance, ast, dynamicAnchors) => {
  return interpret(keywordValue, instance, ast, dynamicAnchors) && new Set(Instance.map((item, ndx) => ndx, instance));
};

module.exports = { id, compile, interpret, collectEvaluatedItems };
