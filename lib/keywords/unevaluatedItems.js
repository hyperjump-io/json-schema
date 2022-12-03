import * as Schema from "../schema.js";
import * as Instance from "../instance.js";
import Validate from "./validate.js";


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

export default { id, compile, interpret, collectEvaluatedItems };
