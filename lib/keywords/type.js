import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/type";

const compile = (schema) => Browser.value(schema);
const interpret = (type, instance) => typeof type === "string"
  ? isTypeOf(instance)(type)
  : type.some(isTypeOf(instance));

const isTypeOf = (instance) => (type) => type === "integer"
  ? instance.typeOf() === "number" && Number.isInteger(instance.value())
  : instance.typeOf() === type;

const description = "Validation succeeds if the type of the instance matches the type represented by the given type, or matches at least one of the given types. Read more: https://www.learnjsonschema.com/2020-12/validation/type/";

export default { id, compile, interpret, description };
