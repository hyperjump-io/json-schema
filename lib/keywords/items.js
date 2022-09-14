const Schema = require("../schema");
const Instance = require("../instance");
const Keywords = require("../keywords");
const Validate = require("./validate");


const id = "https://json-schema.org/keyword/items";

const compile = async (schema, ast, parentSchema) => {
  const prefixItemKeyword = Keywords.getKeywordName(schema.dialectId, "https://json-schema.org/keyword/prefixItems");
  const items = await Schema.step(prefixItemKeyword, parentSchema);
  const numberOfPrefixItems = Schema.typeOf(items, "array") ? Schema.length(items) : 0;

  return [numberOfPrefixItems, await Validate.compile(schema, ast)];
};

const interpret = ([numberOfPrefixItems, items], instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  return Instance.every((item, ndx) => ndx < numberOfPrefixItems || Validate.interpret(items, item, ast, dynamicAnchors), instance);
};

const collectEvaluatedItems = (keywordValue, instance, ast, dynamicAnchors) => {
  return interpret(keywordValue, instance, ast, dynamicAnchors) && new Set(Instance.map((item, ndx) => ndx, instance));
};

module.exports = { id, compile, interpret, collectEvaluatedItems };
