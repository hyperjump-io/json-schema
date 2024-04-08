import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/multipleOf";

const compile = (schema) => Browser.value(schema);

const interpret = (multipleOf, instance) => {
  if (instance.typeOf() !== "number") {
    return true;
  }

  const remainder = instance.value() % multipleOf;
  return numberEqual(0, remainder) || numberEqual(multipleOf, remainder);
};

const numberEqual = (a, b) => Math.abs(a - b) < 1.19209290e-7;

const description = "The multipleOf keyword is used to specify that an instance must be a multiple of a given number. Read more: https://www.learnjsonschema.com/2020-12/validation/multipleof/";

export default { id, compile, interpret, description };
