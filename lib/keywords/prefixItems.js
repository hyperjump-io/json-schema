import * as Pact from "@hyperjump/pact";
import * as Instance from "../instance.js";
import * as Schema from "../schema.js";
import Validate from "./validate.js";


const id = "https://json-schema.org/keyword/prefixItems";

const compile = (schema, ast) => {
  return Pact.pipeline([
    Schema.map((itemSchema) => Validate.compile(itemSchema, ast)),
    Pact.all
  ], schema);
};

const interpret = (items, instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  return Instance.every((item, ndx) => !(ndx in items) || Validate.interpret(items[ndx], item, ast, dynamicAnchors), instance);
};

const collectEvaluatedItems = (items, instance, ast, dynamicAnchors) => {
  return interpret(items, instance, ast, dynamicAnchors) && new Set(items.map((item, ndx) => ndx));
};

export default { id, compile, interpret, collectEvaluatedItems };
