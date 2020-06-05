const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  const propertiesSchema = await Schema.step("properties", parentSchema);
  const propertyNames = Schema.typeOf(propertiesSchema, "object") ? Schema.keys(propertiesSchema) : [];

  const patternProperties = await Schema.step("patternProperties", parentSchema);
  const propertyNamePatterns = Schema.typeOf(patternProperties, "object") ? Schema.keys(patternProperties).map((pattern) => new RegExp(pattern)) : [];

  return [propertyNames, propertyNamePatterns, await Core.compileSchema(schema, ast)];
};

const interpret = ([propertyNames, propertyNamePatterns, additionalProperties], instance, ast) => {
  if (!Instance.typeOf(instance, "object")) {
    return true;
  }

  return Instance.entries(instance)
    .filter(([propertyName]) => !propertyNames.includes(propertyName) && !propertyNamePatterns.some((pattern) => pattern.test(propertyName)))
    .every(([, property]) => Core.interpretSchema(additionalProperties, property, ast));
};

const collectEvaluatedProperties = (keywordValue, instance, ast) => {
  return interpret(keywordValue, instance, ast) && [new RegExp("")];
};

module.exports = { compile, interpret, collectEvaluatedProperties };
