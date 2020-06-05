const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  return [Schema.uri(parentSchema), await Core.compileSchema(schema, ast)];
};

const interpret = ([schemaUrl, unevaluatedItems], instance, ast) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  const tupleLength = Core.collectEvaluatedItems(schemaUrl, instance, ast, true);
  return tupleLength === false || Instance.filter((item, ndx) => ndx >= tupleLength, instance)
    .every((item) => Core.interpretSchema(unevaluatedItems, item, ast));
};

const collectEvaluatedItems = (keywordValue, instance, ast) => {
  return interpret(keywordValue, instance, ast) && Number.MAX_SAFE_INTEGER;
};

module.exports = { compile, interpret, collectEvaluatedItems };
