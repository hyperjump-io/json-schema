const Core = require("../core");
const Json = require("../json");
const { isObject } = require("../common");


const compile = (schema, ast) => Core.compileSchema(schema, ast);

const interpret = (propertyNames, json, ast, results) => {
  const value = Json.value(json);
  return !isObject(value) || Object.keys(value)
    .every((key) => Core.interpretSchema(propertyNames, Json.cons(key), ast, results));
};

module.exports = { compile, interpret };
