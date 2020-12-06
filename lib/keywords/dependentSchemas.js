const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([key, dependentSchema]) => [key, await Core.compileSchema(dependentSchema, ast)]),
  Pact.all
], schema);

const interpret = (dependentSchemas, instance, ast, dynamicAnchors) => {
  const value = Instance.value(instance);

  return !Instance.typeOf(instance, "object") || dependentSchemas.every(([propertyName, dependentSchema]) => {
    return !(propertyName in value) || Core.interpretSchema(dependentSchema, instance, ast, dynamicAnchors);
  });
};

const collectEvaluatedProperties = (dependentSchemas, instance, ast, dynamicAnchors) => {
  return dependentSchemas.reduce((acc, [propertyName, dependentSchema]) => {
    if (!acc || !Instance.has(propertyName, instance)) {
      return acc;
    }

    const propertyNames = Core.collectEvaluatedProperties(dependentSchema, instance, ast, dynamicAnchors);
    return propertyNames !== false && acc.concat(propertyNames);
  }, []);
};

module.exports = { compile, interpret, collectEvaluatedProperties };
