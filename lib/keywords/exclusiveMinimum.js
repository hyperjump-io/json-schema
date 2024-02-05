import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/exclusiveMinimum";

const compile = (schema) => Browser.value(schema);
const interpret = (exclusiveMinimum, instance) => instance.typeOf() !== "number" || instance.value() > exclusiveMinimum;

export default { id, compile, interpret };
