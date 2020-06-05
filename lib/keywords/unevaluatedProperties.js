const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  return [Schema.uri(parentSchema), await Core.compileSchema(schema, ast)];
};

const interpret = ([schemaUrl, unevaluatedProperties], instance, ast) => {
  if (!Instance.typeOf(instance, "object")) {
    return true;
  }

  const evaluatedPropertyNames = Core.collectEvaluatedProperties(schemaUrl, instance, ast, true);

  return !evaluatedPropertyNames || Instance.entries(instance)
    .filter(([propertyName]) => !evaluatedPropertyNames.some((pattern) => propertyName.match(pattern)))
    .every(([, property]) => Core.interpretSchema(unevaluatedProperties, property, ast));
};

const collectEvaluatedProperties = (keywordValue, instance, ast) =>{
  return interpret(keywordValue, instance, ast) && [new RegExp("")];
};

module.exports = { compile, interpret, collectEvaluatedProperties };
