import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/maximum";

const compile = (schema) => Browser.value(schema);
const interpret = (maximum, instance) => instance.typeOf() !== "number" || instance.value() <= maximum;

export default { id, compile, interpret };
