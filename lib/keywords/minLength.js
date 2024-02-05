import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/minLength";

const compile = (schema) => Browser.value(schema);
const interpret = (minLength, instance) => instance.typeOf() !== "string" || [...instance.value()].length >= minLength;

export default { id, compile, interpret };
