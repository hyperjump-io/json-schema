import * as Schema from "../schema.js";
import * as Instance from "../instance.js";
import { getKeywordName } from "../keywords.js";
import Validation from "./validation.js";


const id = "https://json-schema.org/keyword/additionalProperties";

const compile = async (schema, ast, parentSchema) => {
  const propertiesKeyword = getKeywordName(schema.dialectId, "https://json-schema.org/keyword/properties");
  const propertiesSchema = await Schema.step(propertiesKeyword, parentSchema);
  const propertyNames = Schema.typeOf(propertiesSchema, "object") ? Schema.keys(propertiesSchema) : [];

  const patternPropertiesKeyword = getKeywordName(schema.dialectId, "https://json-schema.org/keyword/patternProperties");
  const patternProperties = await Schema.step(patternPropertiesKeyword, parentSchema);
  const propertyNamePatterns = Schema.typeOf(patternProperties, "object") ? Schema.keys(patternProperties).map((pattern) => new RegExp(pattern)) : [];

  return [propertyNames, propertyNamePatterns, await Validation.compile(schema, ast)];
};

const interpret = ([propertyNames, propertyNamePatterns, additionalProperties], instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "object")) {
    return true;
  }

  return Instance.entries(instance)
    .filter(([propertyName]) => !propertyNames.includes(propertyName) && !propertyNamePatterns.some((pattern) => pattern.test(propertyName)))
    .every(([, property]) => Validation.interpret(additionalProperties, property, ast, dynamicAnchors));
};

const collectEvaluatedProperties = ([propertyNames, propertyNamePatterns, additionalProperties], instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "object")) {
    return true;
  }

  const evaluatedPropertyNames = new Set();
  for (const [propertyName, property] of Instance.entries(instance)) {
    if (!propertyNames.includes(propertyName) && !propertyNamePatterns.some((pattern) => pattern.test(propertyName))) {
      if (!Validation.interpret(additionalProperties, property, ast, dynamicAnchors)) {
        return false;
      }

      evaluatedPropertyNames.add(propertyName);
    }
  }

  return evaluatedPropertyNames;
};

export default { id, compile, interpret, collectEvaluatedProperties };
