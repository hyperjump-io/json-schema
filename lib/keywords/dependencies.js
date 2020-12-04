const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([key, dependency]) => {
    return [key, Schema.typeOf(dependency, "array") ? Schema.value(dependency) : await Core.compileSchema(dependency, ast)];
  }),
  Pact.all
], schema);

const interpret = (dependencies, instance, ast, dynamicAnchors) => {
  const value = Instance.value(instance);

  return !Instance.typeOf(instance, "object") || dependencies.every(([propertyName, dependency]) => {
    if (!(propertyName in value)) {
      return true;
    }

    if (Array.isArray(dependency)) {
      return dependency.every((key) => key in value);
    } else {
      return Core.interpretSchema(dependency, instance, ast, dynamicAnchors);
    }
  });
};

module.exports = { compile, interpret };
