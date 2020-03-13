const { JsonSchema, Json } = require("@hyperjump/json-schema-core");
const { isObject } = require("../../../common");


const compile = (schema, ast) => JsonSchema.compileSchema(schema, ast);

const interpret = (propertyNames, json, ast) => {
  const value = Json.value(json);
  return !isObject(value) || Object.keys(value)
    .every((key) => JsonSchema.interpretSchema(propertyNames, Json.cons(key), ast));
};

module.exports = { compile, interpret };
