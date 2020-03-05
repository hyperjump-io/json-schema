const Schema = require("../../../schema");
const Json = require("../../../json");


const compile = async (schema) => Schema.value(schema);

const interpret = (maximum, json) => {
  const value = Json.value(json);
  return typeof value !== "number" || value <= maximum;
};

module.exports = { compile, interpret };
