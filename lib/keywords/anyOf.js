import * as Pact from "@hyperjump/pact";
import * as Schema from "../schema.js";
import Validate from "./validate.js";


const id = "https://json-schema.org/keyword/anyOf";

const compile = (schema, ast) => Pact.pipeline([
  Schema.map(async (itemSchema) => Validate.compile(await itemSchema, ast)),
  Pact.all
], schema);

const interpret = (anyOf, instance, ast, dynamicAnchors) => {
  const matches = anyOf.filter((schemaUrl) => Validate.interpret(schemaUrl, instance, ast, dynamicAnchors));
  return matches.length > 0;
};

const collectEvaluatedProperties = (anyOf, instance, ast, dynamicAnchors) => {
  return anyOf.reduce((acc, schemaUrl) => {
    const propertyNames = Validate.collectEvaluatedProperties(schemaUrl, instance, ast, dynamicAnchors);
    return propertyNames !== false ? [...acc || [], ...propertyNames] : acc;
  }, false);
};

const collectEvaluatedItems = (anyOf, instance, ast, dynamicAnchors) => {
  return anyOf.reduce((acc, schemaUrl) => {
    const itemIndexes = Validate.collectEvaluatedItems(schemaUrl, instance, ast, dynamicAnchors);
    return itemIndexes !== false ? new Set([...acc || [], ...itemIndexes]) : acc;
  }, false);
};

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
