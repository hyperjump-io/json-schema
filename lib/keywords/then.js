const { Core, Schema } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  if (Schema.has("if", parentSchema)) {
    const ifSchema = await Schema.step("if", parentSchema);
    return [await Core.compileSchema(ifSchema, ast), await Core.compileSchema(schema, ast)];
  } else {
    return [];
  }
};

const interpret = ([guard, block], instance, ast, dynamicAnchors) => {
  return guard === undefined || !quietInterpretSchema(guard, instance, ast, dynamicAnchors) || Core.interpretSchema(block, instance, ast, dynamicAnchors);
};

// Interpret a schema without events being emitted
const quietInterpretSchema = (uri, instance, ast, dynamicAnchors) => {
  const nodes = ast[uri][2];

  return typeof nodes === "boolean" ? nodes : nodes
    .every(([keywordId, , keywordValue]) => {
      return Core.getKeyword(keywordId).interpret(keywordValue, instance, ast, dynamicAnchors);
    });
};

const collectEvaluatedProperties = ([guard, block], instance, ast, dynamicAnchors) => {
  if (guard === undefined || !quietInterpretSchema(guard, instance, ast, dynamicAnchors)) {
    return [];
  }

  return Core.collectEvaluatedProperties(block, instance, ast, dynamicAnchors);
};

const collectEvaluatedItems = ([guard, block], instance, ast, dynamicAnchors) => {
  if (guard === undefined || !quietInterpretSchema(guard, instance, ast, dynamicAnchors)) {
    return new Set();
  }

  return Core.collectEvaluatedItems(block, instance, ast, dynamicAnchors);
};

module.exports = { compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
