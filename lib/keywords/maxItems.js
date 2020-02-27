const Schema = require("../schema");
const Json = require("../json");


const compile = (schema) => Schema.value(schema);

const interpret = (maxItems, json) => {
  const value = Json.value(json);
  return !Array.isArray(value) || value.length <= maxItems;
};

module.exports = { compile, interpret };
