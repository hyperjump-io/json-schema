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
  if (guard === undefined) {
    return [];
  }

  const guardPropertyNames = Core.collectEvaluatedProperties(guard, instance, ast, dynamicAnchors);
  if (guardPropertyNames === false) {
    return [];
  }

  const blockPropertyNames = Core.collectEvaluatedProperties(block, instance, ast, dynamicAnchors);
  return blockPropertyNames !== false && [...guardPropertyNames, ...blockPropertyNames];
};

const collectEvaluatedItems = ([guard, block], instance, ast, dynamicAnchors) => {
  if (guard === undefined) {
    return new Set();
  }

  const guardItemIndexes = Core.collectEvaluatedItems(guard, instance, ast, dynamicAnchors);
  if (guardItemIndexes === false) {
    return new Set();
  }

  const blockItemIndexes = Core.collectEvaluatedItems(block, instance, ast, dynamicAnchors);
  return blockItemIndexes !== false && new Set([...guardItemIndexes, ...blockItemIndexes]);
};

module.exports = { compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
