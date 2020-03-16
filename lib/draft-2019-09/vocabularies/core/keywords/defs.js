const Pact = require("@hyperjump/pact");
const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast) => {
  await Pact.pipeline([
    Schema.entries,
    Pact.map(async ([, defSchema]) => JsonSchema.compileSchema(await defSchema, ast)),
    Pact.all
  ], schema);
};

const interpret = () => true;

module.exports = { compile, interpret };
