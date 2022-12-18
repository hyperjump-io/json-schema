import * as Instance from "../lib/instance.js";
import * as Schema from "../lib/schema.js";
import { getKeywordName } from "../lib/keywords.js";
import Validate from "../lib/keywords/validate.js";


const id = "https://json-schema.org/keyword/draft-2019-09/contains";

const compile = async (schema, ast, parentSchema) => {
  const contains = await Validate.compile(schema, ast);

  const minContainsKeyword = getKeywordName(schema.dialectId, "https://json-schema.org/keyword/minContains");
  const minContainsSchema = await Schema.step(minContainsKeyword, parentSchema);
  const minContains = Schema.typeOf(minContainsSchema, "number") ? Schema.value(minContainsSchema) : 1;

  const maxContainsKeyword = getKeywordName(schema.dialectId, "https://json-schema.org/keyword/maxContains");
  const maxContainsSchema = await Schema.step(maxContainsKeyword, parentSchema);
  const maxContains = Schema.typeOf(maxContainsSchema, "number") ? Schema.value(maxContainsSchema) : Number.MAX_SAFE_INTEGER;

  return { contains, minContains, maxContains };
};

const interpret = ({ contains, minContains, maxContains }, instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  const matches = Instance.reduce((matches, item) => {
    return Validate.interpret(contains, item, ast, dynamicAnchors) ? matches + 1 : matches;
  }, 0, instance);
  return matches >= minContains && matches <= maxContains;
};

const collectEvaluatedItems = (keywordValue, instance, ast, dynamicAnchors) => {
  return interpret(keywordValue, instance, ast, dynamicAnchors) && Instance.reduce((matchedIndexes, item, itemIndex) => {
    return Validate.interpret(keywordValue.contains, item, ast, dynamicAnchors) ? matchedIndexes.add(itemIndex) : matchedIndexes;
  }, new Set(), instance);
};

export default { id, compile, interpret, collectEvaluatedItems };
