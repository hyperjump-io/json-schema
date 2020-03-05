const Pact = require("@hyperjump/pact");
const Core = require("../../../core");
const Schema = require("../../../schema");


const compile = (schema, ast) => Pact.pipeline([
  Schema.map(async (itemSchema) => Core.compileSchema(await itemSchema, ast)),
  Pact.all
], schema);

const interpret = (oneOf, json, ast) => {
  let validCount = 0;
  for (const schemaUrl of oneOf) {
    const isValid = Core.interpretSchema(schemaUrl, json, ast);
    if (isValid) {
      validCount++;
    }

    if (validCount > 1) {
      break;
    }
  }

  return validCount === 1;
};

module.exports = { compile, interpret };
