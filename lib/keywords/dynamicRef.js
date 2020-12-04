const { Core, Schema } = require("@hyperjump/json-schema-core");
const { safeResolveUrl, splitUrl } = require("@hyperjump/json-schema-core/lib/common");


const compile = (dynamicRef) => {
  const resolvedUri = safeResolveUrl(dynamicRef.id, Schema.value(dynamicRef));
  return splitUrl(resolvedUri);
};

const interpret = ([id, fragment], instance, ast, dynamicAnchors) => {
  const schemaId = fragment in ast.metaData[id].dynamicAnchors ? dynamicAnchors[fragment] : id;
  const pointer = Schema.getAnchorPointer(ast.metaData[schemaId], fragment);
  return Core.interpretSchema(`${schemaId}#${pointer}`, instance, ast, dynamicAnchors);
};

const collectEvaluatedProperties = Core.collectEvaluatedProperties;
const collectEvaluatedItems = Core.collectEvaluatedItems;

module.exports = { compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
