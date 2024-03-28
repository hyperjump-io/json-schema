import * as Browser from "@hyperjump/browser";
import { Validation, canonicalUri } from "../lib/experimental.js";
import { uriFragment } from "../lib/common.js";


const id = "https://json-schema.org/keyword/draft-2020-12/dynamicRef";

const compile = async (dynamicRef, ast) => {
  const fragment = uriFragment(Browser.value(dynamicRef));
  const referencedSchema = await Browser.get(Browser.value(dynamicRef), dynamicRef);
  await Validation.compile(referencedSchema, ast);
  return [referencedSchema.document.baseUri, fragment, canonicalUri(referencedSchema)];
};

const evaluate = (strategy) => ([id, fragment, ref], instance, ast, dynamicAnchors, quiet) => {
  if (fragment in ast.metaData[id].dynamicAnchors) {
    dynamicAnchors = { ...ast.metaData[id].dynamicAnchors, ...dynamicAnchors };
    return strategy(dynamicAnchors[fragment], instance, ast, dynamicAnchors, quiet);
  } else {
    return strategy(ref, instance, ast, dynamicAnchors, quiet);
  }
};

const interpret = evaluate(Validation.interpret);
const collectEvaluatedProperties = evaluate(Validation.collectEvaluatedProperties);
const collectEvaluatedItems = evaluate(Validation.collectEvaluatedItems);

const description = `This keyword is used to reference an identified schema, \
deferring the full resolution until runtime, at which point it is resolved each \
time it is encountered while evaluating an instance.\\
\\
For examples and more information visit https://www.learnjsonschema.com/2020-12/core/dynamicref/`;

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems, description };
