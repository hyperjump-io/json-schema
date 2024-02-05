import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/type";

const compile = (schema) => Browser.value(schema);
const interpret = (type, instance) => typeof type === "string"
  ? isTypeOf(instance)(type)
  : type.some(isTypeOf(instance));

const isTypeOf = (instance) => (type) => type === "integer"
  ? instance.typeOf() === "number" && Number.isInteger(instance.value())
  : instance.typeOf() === type;

export default { id, compile, interpret };
