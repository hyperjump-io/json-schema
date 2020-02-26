const Schema = require("../schema");
const Json = require("../json");


const compile = async (schema) => Schema.value(schema);

const interpret = (exclusiveMaximum, json) => {
  const value = Json.value(json);
  return typeof value !== "number" || value < exclusiveMaximum;
};

module.exports = { compile, interpret };
