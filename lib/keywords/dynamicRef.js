const { Core, Schema } = require("@hyperjump/json-schema-core");
const { splitUrl } = require("../common");


const compile = async (dynamicRef, ast) => {
  const [, fragment] = splitUrl(Schema.value(dynamicRef));
  const referencedSchema = await Schema.get(Schema.value(dynamicRef), dynamicRef);
  await Core.compileSchema(referencedSchema, ast);
  return [referencedSchema.id, fragment, Schema.uri(referencedSchema)];
};

const interpret = ([id, fragment, ref], instance, ast, dynamicAnchors) => {
  if (fragment in ast.metaData[id].dynamicAnchors) {
    return Core.interpretSchema(dynamicAnchors[fragment], instance, ast, dynamicAnchors);
  } else {
    return Core.interpretSchema(ref, instance, ast, dynamicAnchors);
  }
};

const collectEvaluatedProperties = Core.collectEvaluatedProperties;
const collectEvaluatedItems = Core.collectEvaluatedItems;

module.exports = { compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
