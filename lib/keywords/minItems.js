import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/minItems";

const compile = (schema) => Browser.value(schema);
const interpret = (minItems, instance) => instance.typeOf() !== "array" || instance.length() >= minItems;

const description = "The minItems keyword specifies the minimum number of items that must be present in an array. Read more: https://www.learnjsonschema.com/2020-12/validation/minitems/";

export default { id, compile, interpret, description };
