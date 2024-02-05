import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/minimum";

const compile = (schema) => Browser.value(schema);
const interpret = (minimum, instance) => instance.typeOf() !== "number" || instance.value() >= minimum;

export default { id, compile, interpret };
