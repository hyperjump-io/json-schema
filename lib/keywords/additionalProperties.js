const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");
const { isObject } = require("../common");


const compile = async (schema, ast, parentSchema) => {
  const propertiesSchema = await Schema.step("properties", parentSchema);
  const properties = Schema.value(propertiesSchema) || {};
  const propertyNames = Object.keys(properties);

  const patternPropertiesSchema = await Schema.step("patternProperties", parentSchema);
  const patternProperties = Schema.value(patternPropertiesSchema) || {};
  const propertyNamePatterns = Object.keys(patternProperties)
    .map((pattern) => new RegExp(pattern));

  const value = Schema.value(schema);
  if (typeof value === "boolean") {
    return [propertyNames, propertyNamePatterns, value];
  } else {
    return [propertyNames, propertyNamePatterns, await Core.compileSchema(schema, ast)];
  }
};

const interpret = ([propertyNames, propertyNamePatterns, additionalProperties], instance, ast) => {
  const value = Instance.value(instance);

  if (!isObject(value)) {
    return true;
  }

  const properties = Instance.entries(instance)
    .filter(([propertyName]) => !propertyNames.includes(propertyName) && !propertyNamePatterns.some((pattern) => pattern.test(propertyName)));

  if (typeof additionalProperties === "string") {
    return properties.every(([, property]) => Core.interpretSchema(additionalProperties, property, ast));
  } else {
    return properties.length === 0 || additionalProperties;
  }
};

module.exports = { compile, interpret };
