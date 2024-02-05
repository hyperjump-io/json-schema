import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/maxLength";

const compile = (schema) => Browser.value(schema);
const interpret = (maxLength, instance) => instance.typeOf() !== "string" || [...instance.value()].length <= maxLength;

export default { id, compile, interpret };
