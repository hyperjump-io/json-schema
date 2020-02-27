const Core = require("../core");
const Schema = require("../schema");
const Json = require("../json");
const { isObject } = require("../common");


const compile = async (schema, ast) => {
  let propertyNames;
  try {
    const properties = await Schema.sibling("properties", schema);
    propertyNames = Object.keys(Schema.value(properties));
  } catch (error) {
    propertyNames = [];
  }

  let propertyPatterns;
  try {
    const patternProperties = await Schema.sibling("patternProperties", schema);
    propertyPatterns = Object.keys(Schema.value(patternProperties))
      .map((pattern) => new RegExp(pattern));
  } catch (error) {
    propertyPatterns = [];
  }

  const value = Schema.value(schema);
  if (typeof value === "boolean") {
    return [propertyNames, propertyPatterns, value];
  } else {
    return [propertyNames, propertyPatterns, await Core.compileSchema(schema, ast)];
  }
};

const interpret = ([propertyNames, propertyPatterns, additionalProperties], json, ast) => {
  const value = Json.value(json);

  if (!isObject(value)) {
    return true;
  }

  const properties = Json.entries(json)
    .filter(([propertyName]) => !propertyNames.includes(propertyName) && !propertyPatterns.some((pattern) => pattern.test(propertyName)));

  if (typeof additionalProperties === "string") {
    return properties.every(([, property]) => Core.interpretSchema(additionalProperties, property, ast));
  } else {
    return properties.length === 0 || additionalProperties;
  }
};

module.exports = { compile, interpret };
