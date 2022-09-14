const Schema = require("../schema");
const Instance = require("../instance");
const Keywords = require("../keywords");
const Validate = require("./validate");


const id = "https://json-schema.org/keyword/additionalProperties";

const compile = async (schema, ast, parentSchema) => {
  const propertiesKeyword = Keywords.getKeywordName(schema.dialectId, "https://json-schema.org/keyword/properties");
  const propertiesSchema = await Schema.step(propertiesKeyword, parentSchema);
  const propertyNames = Schema.typeOf(propertiesSchema, "object") ? Schema.keys(propertiesSchema) : [];

  const patternPropertiesKeyword = Keywords.getKeywordName(schema.dialectId, "https://json-schema.org/keyword/patternProperties");
  const patternProperties = await Schema.step(patternPropertiesKeyword, parentSchema);
  const propertyNamePatterns = Schema.typeOf(patternProperties, "object") ? Schema.keys(patternProperties).map((pattern) => new RegExp(pattern)) : [];

  return [propertyNames, propertyNamePatterns, await Validate.compile(schema, ast)];
};

const interpret = ([propertyNames, propertyNamePatterns, additionalProperties], instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "object")) {
    return true;
  }

  return Instance.entries(instance)
    .filter(([propertyName]) => !propertyNames.includes(propertyName) && !propertyNamePatterns.some((pattern) => pattern.test(propertyName)))
    .every(([, property]) => Validate.interpret(additionalProperties, property, ast, dynamicAnchors));
};

const collectEvaluatedProperties = (keywordValue, instance, ast, dynamicAnchors) => {
  return interpret(keywordValue, instance, ast, dynamicAnchors) && [new RegExp("")];
};

module.exports = { id, compile, interpret, collectEvaluatedProperties };
