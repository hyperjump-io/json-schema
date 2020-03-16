const Pact = require("@hyperjump/pact");
const { isObject } = require("../../common");
const { JsonSchema, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema, ast) => Pact.pipeline([
  Schema.entries,
  Pact.map(async ([key, dependencyPromise]) => {
    const dependency = await dependencyPromise;
    const value = await Schema.value(dependency);
    return [key, Array.isArray(value) ? value : await JsonSchema.compileSchema(dependency, ast)];
  }),
  Pact.all
], schema);

const interpret = (dependencies, json, ast) => {
  const value = Instance.value(json);

  return !isObject(value) || dependencies.every(([propertyName, dependency]) => {
    if (!(propertyName in value)) {
      return true;
    }

    if (Array.isArray(dependency)) {
      return dependency.every((key) => key in value);
    } else {
      return JsonSchema.interpretSchema(dependency, json, ast);
    }
  });
};

module.exports = { compile, interpret };
