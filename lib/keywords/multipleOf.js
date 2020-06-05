const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (multipleOf, instance) => {
  if (!Instance.typeOf(instance, "number")) {
    return true;
  }

  const remainder = Instance.value(instance) % multipleOf;
  return numberEqual(0, remainder) || numberEqual(multipleOf, remainder);
};

const numberEqual = (a, b) => {
  return Math.abs(a - b) < Number.EPSILON;
};

module.exports = { compile, interpret };
