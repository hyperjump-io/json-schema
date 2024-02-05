import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/minItems";

const compile = (schema) => Browser.value(schema);
const interpret = (minItems, instance) => instance.typeOf() !== "array" || instance.length() >= minItems;

export default { id, compile, interpret };
