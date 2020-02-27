const Core = require("../core");
const Schema = require("../schema");


const compile = async (schema, ast) => {
  const referencedSchema = await Schema.get(Schema.value(schema), schema, true);
  return Core.compileSchema(referencedSchema, ast);
};

const interpret = (recursiveRef, json, ast) => Core.interpretSchema(recursiveRef, json, ast);

module.exports = { compile, interpret };
