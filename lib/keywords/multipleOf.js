const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/multipleOf";

const compile = (schema) => Schema.value(schema);

const interpret = (multipleOf, instance) => {
  if (!Instance.typeOf(instance, "number")) {
    return true;
  }

  const remainder = Instance.value(instance) % multipleOf;
  return numberEqual(0, remainder) || numberEqual(multipleOf, remainder);
};

const numberEqual = (a, b) => Math.abs(a - b) < 1.19209290e-7;

module.exports = { id, compile, interpret };
