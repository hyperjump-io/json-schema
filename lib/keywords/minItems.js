const Schema = require("../schema");
const Json = require("../json");


const compile = (schema) => Schema.value(schema);
const interpret = (minItems, json) => {
  const value = Json.value(json);
  return !Array.isArray(value) || value.length >= minItems;
};

module.exports = { compile, interpret };
