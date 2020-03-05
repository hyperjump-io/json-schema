const Schema = require("../../../schema");
const Json = require("../../../json");


const compile = async (schema) => Schema.value(schema);

const interpret = (minimum, json) => {
  const value = Json.value(json);
  return typeof value !== "number" || value >= minimum;
};

module.exports = { compile, interpret };
