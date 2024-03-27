import { pipe, filter, every, zip, range } from "@hyperjump/pact";
import { canonicalUri } from "../schema.js";
import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/unevaluatedItems";

const compile = async (schema, ast, parentSchema) => {
  return [canonicalUri(parentSchema), await Validation.compile(schema, ast)];
};

const interpret = ([schemaUrl, unevaluatedItems], instance, ast, dynamicAnchors, quiet) => {
  if (instance.typeOf() !== "array") {
    return true;
  }

  const itemIndexes = Validation.collectEvaluatedItems(schemaUrl, instance, ast, dynamicAnchors, true);
  return itemIndexes === false || pipe(
    zip(instance.iter(), range(0)),
    filter(([, index]) => !itemIndexes.has(index)),
    every(([item]) => Validation.interpret(unevaluatedItems, item, ast, dynamicAnchors, quiet))
  );
};

const collectEvaluatedItems = (keywordValue, instance, ast, dynamicAnchors) => {
  const itemIndexes = Validation.collectEvaluatedItems(keywordValue[0], instance, ast, dynamicAnchors, true);
  if (!itemIndexes) {
    return false;
  }

  const evaluatedIndexes = new Set();
  for (let ndx = 0; ndx < instance.length(); ndx++) {
    if (!itemIndexes.has(ndx)) {
      evaluatedIndexes.add(ndx);
    }
  }
  return evaluatedIndexes;
};

export default { id, compile, interpret, collectEvaluatedItems };
