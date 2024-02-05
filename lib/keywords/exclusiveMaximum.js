import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/exclusiveMaximum";

const compile = (schema) => Browser.value(schema);
const interpret = (exclusiveMaximum, instance) => instance.typeOf() !== "number" || instance.value() < exclusiveMaximum;

export default { id, compile, interpret };
