const { Core, Schema } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  if (Schema.has("if", parentSchema)) {
    const ifSchema = await Schema.step("if", parentSchema);
    return [await Core.compileSchema(ifSchema, ast), await Core.compileSchema(schema, ast)];
  } else {
    return [];
  }
};

const interpret = ([guard, block], instance, ast) => {
  return guard === undefined || quietInterpretSchema(guard, instance, ast) || Core.interpretSchema(block, instance, ast);
};

// Interpret a schema without events being emitted
const quietInterpretSchema = (uri, instance, ast) => {
  const nodes = ast[uri][2];

  return typeof nodes === "boolean" ? nodes : nodes
    .every(([keywordId, , keywordValue]) => {
      return Core.getKeyword(keywordId).interpret(keywordValue, instance, ast);
    });
};

const collectEvaluatedProperties = ([guard, block], instance, ast) => {
  if (guard === undefined || Core.collectEvaluatedProperties(guard, instance, ast) !== false) {
    return [];
  }

  return Core.collectEvaluatedProperties(block, instance, ast);
};

const collectEvaluatedItems = ([guard, block], instance, ast) => {
  if (guard === undefined || Core.interpretSchema(guard, instance, ast)) {
    return 0;
  }

  return Core.collectEvaluatedItems(block, instance, ast);
};

module.exports = { compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
