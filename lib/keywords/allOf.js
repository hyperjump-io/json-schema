import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/allOf";
const description = `An instance validates successfully against this keyword if it validates successfully \
against all schemas defined by this keyword’s value.`;

const compile = (schema, ast) => pipe(
  Browser.iter(schema),
  asyncMap((itemSchema) => Validation.compile(itemSchema, ast)),
  asyncCollectArray
);

const interpret = (allOf, instance, ast, dynamicAnchors, quiet) => {
  let isValid = true;
  for (const schemaUri of allOf) {
    if (!Validation.interpret(schemaUri, instance, ast, dynamicAnchors, quiet)) {
      isValid = false;
    }
  }
  return isValid;
};

const collectEvaluatedProperties = (allOf, instance, ast, dynamicAnchors) => {
  const evaluatedPropertyNames = new Set();
  for (const schemaUrl of allOf) {
    const propertyNames = Validation.collectEvaluatedProperties(schemaUrl, instance, ast, dynamicAnchors);
    if (!propertyNames) {
      return false;
    }

    propertyNames.forEach(evaluatedPropertyNames.add, evaluatedPropertyNames);
  }

  return evaluatedPropertyNames;
};

const collectEvaluatedItems = (allOf, instance, ast, dynamicAnchors) => {
  const evaluatedItemIndexes = new Set();
  for (const schemaUrl of allOf) {
    const itemIndexes = Validation.collectEvaluatedItems(schemaUrl, instance, ast, dynamicAnchors);
    if (!itemIndexes) {
      return false;
    }

    itemIndexes.forEach(evaluatedItemIndexes.add, evaluatedItemIndexes);
  }

  return evaluatedItemIndexes;
};

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems, description };
