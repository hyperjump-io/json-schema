import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/multipleOf";

const compile = (schema) => Browser.value(schema);

const interpret = (multipleOf, instance) => {
  if (Instance.typeOf(instance) !== "number") {
    return true;
  }

  const value = Instance.value(instance);
  const quotient = value / multipleOf;
  if (!Number.isFinite(quotient) || (Number.isInteger(value) && Number.isInteger(multipleOf))) {
    return value % multipleOf === 0;
  }
  return Math.abs(quotient - Math.round(quotient)) <= 4 * Number.EPSILON * Math.max(1, Math.abs(quotient));
};

export default { id, compile, interpret };
