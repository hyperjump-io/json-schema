import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/required";

const compile = (schema) => Browser.value(schema);

const interpret = (required, instance) => {
  return instance.typeOf() !== "object" || required.every((propertyName) => Object.hasOwn(instance.value(), propertyName));
};

export default { id, compile, interpret };
