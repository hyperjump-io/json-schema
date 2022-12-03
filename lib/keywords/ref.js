import * as Schema from "../schema.js";
import Validate from "./validate.js";


const id = "https://json-schema.org/keyword/ref";

const compile = async (ref, ast) => {
  const referencedSchema = await Schema.get(Schema.value(ref), ref);
  return Validate.compile(referencedSchema, ast);
};

const interpret = Validate.interpret;
const collectEvaluatedProperties = Validate.collectEvaluatedProperties;
const collectEvaluatedItems = Validate.collectEvaluatedItems;

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
