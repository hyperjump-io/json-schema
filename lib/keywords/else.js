import * as Browser from "@hyperjump/browser";
import { getKeywordName, Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/else";
const description = `When if is present, and the instance fails to validate against \
its subschema, then validation succeeds against this keyword if the instance successfully \
validates against this keyword’s subschema.`;

const compile = async (schema, ast, parentSchema) => {
  const ifKeyword = getKeywordName(schema.document.dialectId, "https://json-schema.org/keyword/if");
  if (Browser.has(ifKeyword, parentSchema)) {
    const ifSchema = await Browser.step(ifKeyword, parentSchema);
    return [await Validation.compile(ifSchema, ast), await Validation.compile(schema, ast)];
  } else {
    return [];
  }
};

const interpret = ([ifSchema, elseSchema], instance, ast, dynamicAnchors, quiet) => {
  return ifSchema === undefined
    || Validation.interpret(ifSchema, instance, ast, dynamicAnchors, true)
    || Validation.interpret(elseSchema, instance, ast, dynamicAnchors, quiet);
};

const collectEvaluatedProperties = ([ifSchema, elseSchema], instance, ast, dynamicAnchors) => {
  if (ifSchema === undefined || Validation.interpret(ifSchema, instance, ast, dynamicAnchors, true)) {
    return new Set();
  }

  return Validation.collectEvaluatedProperties(elseSchema, instance, ast, dynamicAnchors);
};

const collectEvaluatedItems = ([ifSchema, elseSchema], instance, ast, dynamicAnchors) => {
  if (ifSchema === undefined || Validation.interpret(ifSchema, instance, ast, dynamicAnchors, true)) {
    return new Set();
  }

  return Validation.collectEvaluatedItems(elseSchema, instance, ast, dynamicAnchors);
};

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems, description };
