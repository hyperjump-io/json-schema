const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = (schema) => Schema.value(schema);

const interpret = (multipleOf, json) => {
  const value = Instance.value(json);
  if (typeof value !== "number") {
    return true;
  }

  const remainder = value % multipleOf;
  return numberEqual(0, remainder) || numberEqual(multipleOf, remainder);
};

const numberEqual = (a, b) => {
  return Math.abs(a - b) < Number.EPSILON;
};

module.exports = { compile, interpret };
