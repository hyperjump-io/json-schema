import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/required";

const compile = (schema) => Browser.value(schema);

const interpret = (required, instance) => {
  return Instance.typeOf(instance) !== "object" || required.every((propertyName) => Object.hasOwn(Instance.value(instance), propertyName));
};

const description = "The required keyword is used to specify which properties must be present within an object instance. Read more: https://www.learnjsonschema.com/2020-12/validation/required/";

export default { id, compile, interpret, description };
