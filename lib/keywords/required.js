import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/required";

const compile = (schema) => Browser.value(schema);

const interpret = (required, instance) => {
  if (Instance.typeOf(instance) !== "object") {
    return true;
  }

  return required.every((propertyName) => Instance.has(propertyName, instance));
};

export default { id, compile, interpret };
