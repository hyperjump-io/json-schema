import * as Pact from "@hyperjump/pact";
import * as Schema from "../schema.js";
import * as Instance from "../instance.js";
import Validate from "./validate.js";


const id = "https://json-schema.org/keyword/propertyDependencies";
const unstable = true;

const compile = async (schema, ast) => {
  return Pact.pipeline([
    Schema.entries,
    Pact.reduce(async (propertyDependencies, [propertyName, valueMappings]) => {
      propertyDependencies[propertyName] = await Pact.pipeline([
        Schema.entries,
        Pact.reduce(async (valueMappings, [propertyValue, conditionalSchema]) => {
          valueMappings[propertyValue] = await Validate.compile(conditionalSchema, ast);
          return valueMappings;
        }, {})
      ], valueMappings);
      return propertyDependencies;
    }, {})
  ], schema);
};

const interpret = (propertyDependencies, instance, ast, dynamicAnchors) => {
  return !Instance.typeOf(instance, "object") || Object.entries(propertyDependencies).every(([propertyName, valueMappings]) => {
    const propertyValue = Instance.value(instance)[propertyName];
    return !Instance.has(propertyName, instance)
      || !(propertyValue in valueMappings)
      || Validate.interpret(valueMappings[propertyValue], instance, ast, dynamicAnchors);
  });
};

const collectEvaluatedProperties = (propertyDependencies, instance, ast, dynamicAnchors) => {
  return Object.entries(propertyDependencies)
    .reduce((acc, [propertyName, valueMappings]) => {
      const propertyValue = Instance.value(instance)[propertyName];

      if (Instance.has(propertyName, instance) && propertyValue in valueMappings) {
        const propertyNames = Validate.collectEvaluatedProperties(valueMappings[propertyValue], instance, ast, dynamicAnchors);
        return propertyNames !== false && acc.concat(propertyNames);
      } else {
        return acc;
      }
    }, []);
};

export default { id, unstable, compile, interpret, collectEvaluatedProperties };
