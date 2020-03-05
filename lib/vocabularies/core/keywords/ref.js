const Core = require("../../../core");
const Schema = require("../../../schema");


const compile = async (schema, ast) => {
  const referencedSchema = await Schema.get(Schema.value(schema), schema);
  return Core.compileSchema(referencedSchema, ast);
};

const interpret = (ref, json, ast) => Core.interpretSchema(ref, json, ast);

module.exports = { compile, interpret };
