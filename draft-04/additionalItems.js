import { pipe, drop, every } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import { getKeywordName, Validation } from "../lib/experimental.js";


const id = "https://json-schema.org/keyword/draft-04/additionalItems";

const compile = async (schema, ast, parentSchema) => {
  const itemsKeywordName = getKeywordName(schema.document.dialectId, "https://json-schema.org/keyword/draft-04/items");
  const items = await Browser.step(itemsKeywordName, parentSchema);
  const numberOfItems = Browser.typeOf(items) === "array" ? Browser.length(items) : Number.MAX_SAFE_INTEGER;

  return [numberOfItems, await Validation.compile(schema, ast)];
};

const interpret = ([numberOfItems, additionalItems], instance, ast, dynamicAnchors, quiet) => {
  if (instance.typeOf() !== "array") {
    return true;
  }

  return pipe(
    instance.iter(),
    drop(numberOfItems),
    every((item) => Validation.interpret(additionalItems, item, ast, dynamicAnchors, quiet))
  );
};

const collectEvaluatedItems = (keywordValue, instance, ast, dynamicAnchors) => {
  if (!interpret(keywordValue, instance, ast, dynamicAnchors)) {
    return false;
  }

  const evaluatedIndexes = new Set();
  for (let ndx = keywordValue[0]; ndx < instance.length(); ndx++) {
    evaluatedIndexes.add(ndx);
  }

  return evaluatedIndexes;
};

export default { id, compile, interpret, collectEvaluatedItems };
