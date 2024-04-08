import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/maxLength";

const compile = (schema) => Browser.value(schema);
const interpret = (maxLength, instance) => {
  return Instance.typeOf(instance) !== "string" || [...Instance.value(instance)].length <= maxLength;
};

const description = "The maxLength keyword is used to specify the maximum length of a string instance. Read more: https://www.learnjsonschema.com/2020-12/validation/maxlength/";

export default { id, compile, interpret, description };
