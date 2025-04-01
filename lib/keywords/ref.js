import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/ref";

const compile = (...args) => Validation.compile(...args);
const interpret = (...args) => Validation.interpret(...args);
const collectEvaluatedProperties = (...args) => Validation.collectEvaluatedProperties(...args);
const collectEvaluatedItems = (...args) => Validation.collectEvaluatedItems(...args);

const simpleApplicator = true;

export default { id, compile, interpret, simpleApplicator, collectEvaluatedProperties, collectEvaluatedItems };
