const Pact = require("@hyperjump/pact");
const Core = require("../core");
const Schema = require("../schema");


const compile = async (schema, ast) => {
  await Pact.pipeline([
    Schema.entries,
    Pact.map(async ([, defSchema]) => Core.compileSchema(await defSchema, ast)),
    Pact.all
  ], schema);
};

const interpret = () => true;

module.exports = { compile, interpret };
