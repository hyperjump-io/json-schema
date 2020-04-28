const { Core, Schema } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = async (schema, ast) => {
  await Pact.pipeline([
    Schema.entries,
    Pact.map(([, definitionSchema]) => Core.compileSchema(definitionSchema, ast)),
    Pact.all
  ], schema);
};

const interpret = () => true;

module.exports = { compile, interpret };
