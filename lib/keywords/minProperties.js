import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/minProperties";

const compile = (schema) => Browser.value(schema);
const interpret = (minProperties, instance) => {
  return Instance.typeOf(instance) !== "object" || [...Instance.keys(instance)].length >= minProperties;
};

const description = "The minProperties keyword is used to specify the inclusive minimum number of properties allowed in an object instnace. Read more: https://www.learnjsonschema.com/2020-12/validation/minproperties/";

export default { id, compile, interpret, description };
