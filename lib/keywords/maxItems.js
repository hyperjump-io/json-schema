import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/maxItems";

const compile = (schema) => Browser.value(schema);
const interpret = (maxItems, instance) => instance.typeOf() !== "array" || instance.length() <= maxItems;

const description = "The maxItems keyword is used to specify the maximum number of items allowed in an array. Read more: https://www.learnjsonschema.com/2020-12/validation/maxitems/";

export default { id, compile, interpret, description };
