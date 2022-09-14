const Pact = require("@hyperjump/pact");
const Schema = require("../schema");
const Validate = require("./validate");


const id = "https://json-schema.org/keyword/definitions";

const compile = async (schema, ast) => {
  await Pact.pipeline([
    Schema.entries,
    Pact.map(([, definitionSchema]) => Validate.compile(definitionSchema, ast)),
    Pact.all
  ], schema);
};

const interpret = () => true;

module.exports = { id, compile, interpret };
