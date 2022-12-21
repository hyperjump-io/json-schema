import * as Schema from "../schema.js";
import * as Instance from "../instance.js";
import { getKeywordName } from "../keywords.js";
import Validate from "./validate.js";


const id = "https://json-schema.org/keyword/contains";

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
  if (!Instance.typeOf(instance, "array") && !Instance.typeOf(instance, "object")) {
    return true;
  }

  const matches = Instance.entries(instance).reduce((matches, [, item]) => {
    return Validate.interpret(contains, item, ast, dynamicAnchors) ? matches + 1 : matches;
  }, 0);
  return matches >= minContains && matches <= maxContains;
};

const collectEvaluatedItems = (keywordValue, instance, ast, dynamicAnchors) => {
  return interpret(keywordValue, instance, ast, dynamicAnchors) &&
    Instance.typeOf(instance, "array") &&
    Instance.reduce((matchedIndexes, item, itemIndex) => {
      return Validate.interpret(keywordValue.contains, item, ast, dynamicAnchors) ? matchedIndexes.add(itemIndex) : matchedIndexes;
    }, new Set(), instance);
};

const collectEvaluatedProperties = (keywordValue, instance, ast, dynamicAnchors) => {
  return interpret(keywordValue, instance, ast, dynamicAnchors) &&
    Instance.typeOf(instance, "object") &&
    Instance.entries(instance).reduce((matchedPropertyNames, [propertyName, item]) => {
      if (Validate.interpret(keywordValue.contains, item, ast, dynamicAnchors)) {
        matchedPropertyNames.push(propertyName);
      }
      return matchedPropertyNames;
    }, [], instance);
};

export default { id, compile, interpret, collectEvaluatedItems, collectEvaluatedProperties };
