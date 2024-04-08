import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/required";

const compile = (schema) => Browser.value(schema);

const interpret = (required, instance) => {
  return instance.typeOf() !== "object" || required.every((propertyName) => Object.hasOwn(instance.value(), propertyName));
};

const description = "The required keyword is used to specify which properties must be present within an object instance. Read more: https://www.learnjsonschema.com/2020-12/validation/required/";

export default { id, compile, interpret, description };
