import * as Browser from "@hyperjump/browser";
import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/dynamicRef";

const compile = async (schema, ast) => {
  const reference = Browser.value(schema);
  const self = await Browser.get(schema.document.baseUri, schema);
  await Validation.compile(self, ast);

  return reference;
};

const evaluate = (strategy, fragment, instance, context) => {
  if (!(fragment in context.dynamicAnchors)) {
    throw Error(`No dynamic anchor found for "${fragment}"`);
  }
  return strategy(context.dynamicAnchors[fragment], instance, context);
};

const interpret = (...args) => evaluate(Validation.interpret, ...args);
const collectEvaluatedProperties = (...args) => evaluate(Validation.collectEvaluatedProperties, ...args);
const collectEvaluatedItems = (...args) => evaluate(Validation.collectEvaluatedItems, ...args);

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
