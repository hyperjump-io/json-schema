const Schema = require("../schema");
const Keywords = require("../keywords");
const Validate = require("./validate");


const id = "https://json-schema.org/keyword/else";

const compile = async (schema, ast, parentSchema) => {
  const ifKeyword = Keywords.getKeywordName(schema.dialectId, "https://json-schema.org/keyword/if");
  if (Schema.has(ifKeyword, parentSchema)) {
    const ifSchema = await Schema.step(ifKeyword, parentSchema);
    return [await Validate.compile(ifSchema, ast), await Validate.compile(schema, ast)];
  } else {
    return [];
  }
};

const interpret = ([guard, block], instance, ast, dynamicAnchors) => {
  return guard === undefined || quietInterpretSchema(guard, instance, ast, dynamicAnchors) || Validate.interpret(block, instance, ast, dynamicAnchors);
};

// Interpret a schema without events being emitted
const quietInterpretSchema = (uri, instance, ast, dynamicAnchors) => {
  const nodes = ast[uri][2];

  return typeof nodes === "boolean" ? nodes : nodes
    .every(([keywordId, , keywordValue]) => {
      return Keywords.getKeyword(keywordId).interpret(keywordValue, instance, ast, dynamicAnchors);
    });
};

const collectEvaluatedProperties = ([guard, block], instance, ast, dynamicAnchors) => {
  if (guard === undefined || quietInterpretSchema(guard, instance, ast, dynamicAnchors)) {
    return [];
  }

  return Validate.collectEvaluatedProperties(block, instance, ast, dynamicAnchors);
};

const collectEvaluatedItems = ([guard, block], instance, ast, dynamicAnchors) => {
  if (guard === undefined || quietInterpretSchema(guard, instance, ast, dynamicAnchors)) {
    return new Set();
  }

  return Validate.collectEvaluatedItems(block, instance, ast, dynamicAnchors);
};

module.exports = { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
