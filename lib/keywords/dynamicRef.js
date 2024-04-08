import * as Browser from "@hyperjump/browser";
import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/dynamicRef";
const description = `This keyword is used to reference an identified schema, deferring the full \
resolution until runtime, at which point it is resolved each time it is encountered while evaluating an instance.`;

const compile = async (schema, ast) => {
  const reference = Browser.value(schema);
  const self = await Browser.get(schema.document.baseUri, schema);
  await Validation.compile(self, ast);

  return reference;
};

const evaluate = (strategy) => (fragment, instance, ast, dynamicAnchors, quiet) => {
  if (!(fragment in dynamicAnchors)) {
    throw Error(`No dynamic anchor found for "${fragment}"`);
  }
  return strategy(dynamicAnchors[fragment], instance, ast, dynamicAnchors, quiet);
};

const interpret = evaluate(Validation.interpret);
const collectEvaluatedProperties = evaluate(Validation.collectEvaluatedProperties);
const collectEvaluatedItems = evaluate(Validation.collectEvaluatedItems);

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems, description };
