const Schema = require("../schema");
const Validate = require("./validate");


const id = "https://json-schema.org/keyword/ref";

const compile = async (ref, ast) => {
  const referencedSchema = await Schema.get(Schema.value(ref), ref);
  return Validate.compile(referencedSchema, ast);
};

const interpret = Validate.interpret;
const collectEvaluatedProperties = Validate.collectEvaluatedProperties;
const collectEvaluatedItems = Validate.collectEvaluatedItems;

module.exports = { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
