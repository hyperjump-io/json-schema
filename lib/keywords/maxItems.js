import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/maxItems";

const compile = (schema) => Browser.value(schema);
const interpret = (maxItems, instance) => instance.typeOf() !== "array" || instance.length() <= maxItems;

export default { id, compile, interpret };
