import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/minLength";

const compile = (schema) => Browser.value(schema);
const interpret = (minLength, instance) => instance.typeOf() !== "string" || [...instance.value()].length >= minLength;

const description = "The minLength keyword is used to specify the minimum length of a string instance. Read more: https://www.learnjsonschema.com/2020-12/validation/minlength/";

export default { id, compile, interpret, description };
