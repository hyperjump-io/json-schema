const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  const properties = await Schema.step("properties", parentSchema);
  const propertyNames = Schema.typeOf(properties, "object") ? Schema.keys(properties) : [];

  const patternProperties = await Schema.step("patternProperties", parentSchema);
  const propertyNamePatterns = Schema.typeOf(patternProperties, "object") ? Schema.keys(patternProperties).map((pattern) => new RegExp(pattern)) : [];

  if (Schema.typeOf(schema, "boolean")) {
    return [propertyNames, propertyNamePatterns, Schema.value(schema)];
  } else {
    return [propertyNames, propertyNamePatterns, await Core.compileSchema(schema, ast)];
  }
};

const interpret = ([propertyNames, propertyNamePatterns, additionalProperties], instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "object")) {
    return true;
  }

  const properties = Instance.entries(instance)
    .filter(([propertyName]) => !propertyNames.includes(propertyName) && !propertyNamePatterns.some((pattern) => pattern.test(propertyName)));

  if (typeof additionalProperties === "string") {
    return properties.every(([, property]) => Core.interpretSchema(additionalProperties, property, ast, dynamicAnchors));
  } else {
    return properties.length === 0 || additionalProperties;
  }
};

module.exports = { compile, interpret };
