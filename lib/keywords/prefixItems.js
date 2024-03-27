import { pipe, asyncMap, asyncCollectArray, zip } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/prefixItems";

const compile = (schema, ast) => pipe(
  Browser.iter(schema),
  asyncMap((itemSchema) => Validation.compile(itemSchema, ast)),
  asyncCollectArray
);

const interpret = (prefixItems, instance, ast, dynamicAnchors, quiet) => {
  if (instance.typeOf() !== "array") {
    return true;
  }

  let isValid = true;
  let index = 0;
  const instanceLength = instance.length();
  for (const [schemaUri, item] of zip(prefixItems, instance.iter())) {
    if (index >= instanceLength) {
      break;
    }

    if (!Validation.interpret(schemaUri, item, ast, dynamicAnchors, quiet)) {
      isValid = false;
    }

    index++;
  }

  return isValid;
};

const collectEvaluatedItems = (items, instance, ast, dynamicAnchors) => {
  return interpret(items, instance, ast, dynamicAnchors, true) && new Set(items.map((_item, ndx) => ndx));
};

export default { id, compile, interpret, collectEvaluatedItems };
