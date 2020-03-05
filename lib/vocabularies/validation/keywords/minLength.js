const Schema = require("../../../schema");
const Json = require("../../../json");


const compile = (schema) => Schema.value(schema);

const interpret = (minLength, json) => {
  const value = Json.value(json);
  return typeof value !== "string" || [...value].length >= minLength;
};

module.exports = { compile, interpret };
