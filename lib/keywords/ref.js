const { Core, Schema } = require("@hyperjump/json-schema-core");


const compile = async (ref, ast) => {
  const referencedSchema = await Schema.get(Schema.value(ref), ref);
  return Core.compileSchema(referencedSchema, ast);
};

const interpret = Core.interpretSchema;
const collectEvaluatedProperties = Core.collectEvaluatedProperties;
const collectEvaluatedItems = Core.collectEvaluatedItems;

module.exports = { compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
