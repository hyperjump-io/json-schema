import * as Schema from "../schema.js";
import Validate from "./validate.js";


const id = "https://json-schema.org/keyword/oneOf";

const compile = async (schema, ast) => {
  const oneOf = await Schema.map((itemSchema) => Validate.compile(itemSchema, ast), schema);
  return Promise.all(oneOf);
};

const interpret = (oneOf, instance, ast, dynamicAnchors) => {
  let validCount = 0;
  for (const schemaUrl of oneOf) {
    if (Validate.interpret(schemaUrl, instance, ast, dynamicAnchors)) {
      validCount++;
    }

    if (validCount > 1) {
      break;
    }
  }

  return validCount === 1;
};

const collectEvaluatedProperties = (oneOf, instance, ast, dynamicAnchors) => {
  let validCount = 0;
  return oneOf.reduce((acc, schemaUrl) => {
    if (validCount > 1) {
      return false;
    }

    const propertyNames = Validate.collectEvaluatedProperties(schemaUrl, instance, ast, dynamicAnchors);
    return propertyNames ? validCount++ === 0 && propertyNames : acc;
  }, false);
};

const collectEvaluatedItems = (oneOf, instance, ast, dynamicAnchors) => {
  let validCount = 0;
  return oneOf.reduce((acc, schemaUrl) => {
    if (validCount > 1) {
      return false;
    }

    const itemIndexes = Validate.collectEvaluatedItems(schemaUrl, instance, ast, dynamicAnchors);
    return itemIndexes ? validCount++ === 0 && itemIndexes : acc;
  }, false);
};

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
