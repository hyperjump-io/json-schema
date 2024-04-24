import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/ref";
const description = `This keyword is used to reference a statically identified schema.`;

const compile = Validation.compile;
const interpret = Validation.interpret;
const collectEvaluatedProperties = Validation.collectEvaluatedProperties;
const collectEvaluatedItems = Validation.collectEvaluatedItems;

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems, description };
