const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast) => {
  if (Schema.typeOf(schema, "array")) {
    const tupleItems = await Schema.map((itemSchema) => Core.compileSchema(itemSchema, ast), schema);
    return Promise.all(tupleItems);
  } else {
    return Core.compileSchema(schema, ast);
  }
};

const interpret = (items, instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  if (typeof items === "string") {
    return Instance.every((itemValue) => Core.interpretSchema(items, itemValue, ast, dynamicAnchors), instance);
  } else {
    return Instance.every((item, ndx) => !(ndx in items) || Core.interpretSchema(items[ndx], item, ast, dynamicAnchors), instance);
  }
};

const collectEvaluatedItems = (items, instance, ast, dynamicAnchors) => {
  return interpret(items, instance, ast, dynamicAnchors) && (typeof items === "string"
    ? new Set(Instance.map((item, itemIndex) => itemIndex, instance))
    : new Set(items.map((item, itemIndex) => itemIndex)));
};

module.exports = { compile, interpret, collectEvaluatedItems };
