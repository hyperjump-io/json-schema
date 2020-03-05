const { isObject } = require("../../../common");
const Json = require("../../../json");
const Schema = require("../../../schema");


const compile = (schema) => Schema.value(schema);

const interpret = (required, json) => {
  const value = Json.value(json);
  return !isObject(value) || required.every((propertyName) => propertyName in value);
};

module.exports = { compile, interpret };
