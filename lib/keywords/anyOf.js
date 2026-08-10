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
  return anyOf.filter((schemaUrl) => Validation.interpret(schemaUrl, instance, context)).length > 0;
};

export default { id, compile, interpret };
