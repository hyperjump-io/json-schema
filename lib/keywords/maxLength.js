const Schema = require("../schema");
const Json = require("../json");


const compile = (schema) => Schema.value(schema);

const interpret = (maxLength, json) => {
  const value = Json.value(json);
  return typeof value !== "string" || value.length <= maxLength;
};

module.exports = { compile, interpret };
