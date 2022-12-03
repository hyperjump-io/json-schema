import * as Pact from "@hyperjump/pact";
import * as Schema from "../schema.js";
import Validate from "./validate.js";


const id = "https://json-schema.org/keyword/allOf";

const compile = (schema, ast) => Pact.pipeline([
  Schema.map(async (itemSchema) => Validate.compile(await itemSchema, ast)),
  Pact.all
], schema);

const interpret = (allOf, instance, ast, dynamicAnchors) => {
  return allOf.every((schemaUrl) => Validate.interpret(schemaUrl, instance, ast, dynamicAnchors));
};

const collectEvaluatedProperties = (allOf, instance, ast, dynamicAnchors) => {
  return allOf.reduce((acc, schemaUrl) => {
    const propertyNames = acc && Validate.collectEvaluatedProperties(schemaUrl, instance, ast, dynamicAnchors);
    return propertyNames !== false && [...acc, ...propertyNames];
  }, []);
};

const collectEvaluatedItems = (allOf, instance, ast, dynamicAnchors) => {
  return allOf.reduce((acc, schemaUrl) => {
    const itemIndexes = acc !== false && Validate.collectEvaluatedItems(schemaUrl, instance, ast, dynamicAnchors);
    return itemIndexes !== false && new Set([...acc, ...itemIndexes]);
  }, new Set());
};

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
