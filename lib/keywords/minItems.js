import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/minItems";

const compile = (schema) => Browser.value(schema);
const interpret = (minItems, instance) => {
  return Instance.typeOf(instance) !== "array" || Instance.length(instance) >= minItems;
};

const description = "The minItems keyword specifies the minimum number of items that must be present in an array. Read more: https://www.learnjsonschema.com/2020-12/validation/minitems/";

export default { id, compile, interpret, description };
