const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");
const Pact = require("@hyperjump/pact");


const compile = (schema, ast) => Pact.pipeline([
  Schema.map(async (itemSchema) => JsonSchema.compileSchema(await itemSchema, ast)),
  Pact.all
], schema);

const interpret = (oneOf, instance, ast) => {
  let validCount = 0;
  for (const schemaUrl of oneOf) {
    const isValid = JsonSchema.interpretSchema(schemaUrl, instance, ast);
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
