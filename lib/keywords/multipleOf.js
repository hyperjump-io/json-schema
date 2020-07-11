const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (multipleOf, instance) => {
  if (!Instance.typeOf(instance, "number")) {
    return true;
  }

  const remainder = Instance.value(instance) % multipleOf;
  return numberEqual(0, remainder) || numberEqual(multipleOf, remainder);
};

const numberEqual = (a, b) => Math.abs(a - b) < 1.19209290e-7;

module.exports = { compile, interpret };
