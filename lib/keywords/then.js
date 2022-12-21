import * as Schema from "../schema.js";
import { getKeywordName, getKeyword } from "../keywords.js";
import Validate from "./validate.js";


const id = "https://json-schema.org/keyword/then";

const compile = async (schema, ast, parentSchema) => {
  const ifKeyword = getKeywordName(schema.dialectId, "https://json-schema.org/keyword/if");
  if (Schema.has(ifKeyword, parentSchema)) {
    const ifSchema = await Schema.step(ifKeyword, parentSchema);
    return [await Validate.compile(ifSchema, ast), await Validate.compile(schema, ast)];
  } else {
    return [];
  }
};

const interpret = ([guard, block], instance, ast, dynamicAnchors) => {
  return guard === undefined || !quietInterpretSchema(guard, instance, ast, dynamicAnchors) || Validate.interpret(block, instance, ast, dynamicAnchors);
};

// Interpret a schema without events being emitted
const quietInterpretSchema = (url, instance, ast, dynamicAnchors) => {
  const nodes = ast[url][2];

  return typeof nodes === "boolean" ? nodes : nodes
    .every(([keywordId, , keywordValue]) => {
      return getKeyword(keywordId).interpret(keywordValue, instance, ast, dynamicAnchors);
    });
};

const collectEvaluatedProperties = ([guard, block], instance, ast, dynamicAnchors) => {
  if (guard === undefined || !quietInterpretSchema(guard, instance, ast, dynamicAnchors)) {
    return [];
  }

  return Validate.collectEvaluatedProperties(block, instance, ast, dynamicAnchors);
};

const collectEvaluatedItems = ([guard, block], instance, ast, dynamicAnchors) => {
  if (guard === undefined || !quietInterpretSchema(guard, instance, ast, dynamicAnchors)) {
    return new Set();
  }

  return Validate.collectEvaluatedItems(block, instance, ast, dynamicAnchors);
};

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
