const Schema = require("../schema");
const Instance = require("../instance");


const id = "https://json-schema.org/keyword/required";

const compile = (schema) => Schema.value(schema);

const interpret = (required, instance) => {
  return !Instance.typeOf(instance, "object") || required.every((propertyName) => Object.prototype.hasOwnProperty.call(Instance.value(instance), propertyName));
};

module.exports = { id, compile, interpret };
