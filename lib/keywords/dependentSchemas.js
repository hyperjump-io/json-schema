import * as Pact from "@hyperjump/pact";
import * as Schema from "../schema.js";
import * as Instance from "../instance.js";
import Validate from "./validate.js";


const id = "https://json-schema.org/keyword/dependentSchemas";

const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([key, dependentSchema]) => [key, await Validate.compile(dependentSchema, ast)]),
  Pact.all
], schema);

const interpret = (dependentSchemas, instance, ast, dynamicAnchors) => {
  const value = Instance.value(instance);

  return !Instance.typeOf(instance, "object") || dependentSchemas.every(([propertyName, dependentSchema]) => {
    return !(propertyName in value) || Validate.interpret(dependentSchema, instance, ast, dynamicAnchors);
  });
};

const collectEvaluatedProperties = (dependentSchemas, instance, ast, dynamicAnchors) => {
  return dependentSchemas.reduce((acc, [propertyName, dependentSchema]) => {
    if (!acc || !Instance.has(propertyName, instance)) {
      return acc;
    }

    const propertyNames = Validate.collectEvaluatedProperties(dependentSchema, instance, ast, dynamicAnchors);
    return propertyNames !== false && acc.concat(propertyNames);
  }, []);
};

export default { id, compile, interpret, collectEvaluatedProperties };
