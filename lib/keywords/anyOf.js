import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/anyOf";

const compile = (schema, ast) => pipe(
  Browser.iter(schema),
  asyncMap((itemSchema) => Validation.compile(itemSchema, ast)),
  asyncCollectArray
);

const interpret = (anyOf, instance, context) => {
  // Every subschema is evaluated, even after one passes, so annotations are collected from all of them
  let isValid = false;
  for (const schemaUrl of anyOf) {
    if (Validation.interpret(schemaUrl, instance, context)) {
      isValid = true;
    }
  }

  return isValid;
};

export default { id, compile, interpret };
