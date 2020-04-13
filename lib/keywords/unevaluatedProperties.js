const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");
const { isObject } = require("../common");


const compile = async (schema, ast, parentSchema) => {
  return [Schema.uri(parentSchema), await Core.compileSchema(schema, ast)];
};

const interpret = ([schemaUrl, unevaluatedProperties], instance, ast) => {
  const value = Instance.value(instance);
  if (!isObject(value)) {
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
