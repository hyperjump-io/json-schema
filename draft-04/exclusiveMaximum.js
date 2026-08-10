import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/draft-04/exclusiveMaximum";
const compile = (schema) => Browser.value(schema);
const interpret = () => true;

export default { id, compile, interpret };
