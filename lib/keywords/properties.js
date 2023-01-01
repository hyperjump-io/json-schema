import * as Pact from "@hyperjump/pact";
import * as Schema from "../schema.js";
import * as Instance from "../instance.js";
import Validation from "./validation.js";


const id = "https://json-schema.org/keyword/properties";

const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.reduce(async (acc, [propertyName, propertySchema]) => {
    acc[propertyName] = await Validation.compile(propertySchema, ast);
    return acc;
  }, Object.create(null))
], schema);

const interpret = (properties, instance, ast, dynamicAnchors) => {
  return !Instance.typeOf(instance, "object") || Instance.entries(instance)
    .filter(([propertyName]) => propertyName in properties)
    .every(([propertyName, schemaUrl]) => Validation.interpret(properties[propertyName], schemaUrl, ast, dynamicAnchors));
};

const collectEvaluatedProperties = (properties, instance, ast, dynamicAnchors) => {
  return interpret(properties, instance, ast, dynamicAnchors) && Object.keys(properties)
    .map((propertyName) => new RegExp(`^${escapeRegExp(propertyName)}$`));
};

const escapeRegExp = (string) => string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");

export default { id, compile, interpret, collectEvaluatedProperties };
