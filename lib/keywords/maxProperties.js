import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/maxProperties";

const compile = (schema) => Browser.value(schema);
const interpret = (maxProperties, instance) => {
  return Instance.typeOf(instance) !== "object" || [...Instance.keys(instance)].length <= maxProperties;
};

const description = "The maxProperties keyword is used to specify the maximum number of properties allowed in an object instnace. Read more: https://www.learnjsonschema.com/2020-12/validation/maxproperties/";

export default { id, compile, interpret, description };
