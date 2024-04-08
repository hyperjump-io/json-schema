import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/minLength";

const compile = (schema) => Browser.value(schema);
const interpret = (minLength, instance) => {
  return Instance.typeOf(instance) !== "string" || [...Instance.value(instance)].length >= minLength;
};

const description = "The minLength keyword is used to specify the minimum length of a string instance. Read more: https://www.learnjsonschema.com/2020-12/validation/minlength/";

export default { id, compile, interpret, description };
