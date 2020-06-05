const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([key, dependentSchema]) => [key, await Core.compileSchema(dependentSchema, ast)]),
  Pact.all
], schema);

const interpret = (dependentSchemas, instance, ast) => {
  const value = Instance.value(instance);

  return !Instance.typeOf(instance, "object") || dependentSchemas.every(([propertyName, dependentSchema]) => {
    return !(propertyName in value) || Core.interpretSchema(dependentSchema, instance, ast);
  });
};

const collectEvaluatedProperties = (dependentSchemas, instance, ast) => {
  const value = Instance.value(instance);

  return dependentSchemas.reduce((acc, [propertyName, dependentSchema]) => {
    if (!acc || !(propertyName in value)) {
      return acc;
    }

    const propertyNames = Core.collectEvaluatedProperties(dependentSchema, instance, ast);
    return propertyNames && acc.concat(propertyNames);
  }, []);
};

module.exports = { compile, interpret, collectEvaluatedProperties };
