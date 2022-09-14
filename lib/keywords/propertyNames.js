const Instance = require("../instance");
const Validate = require("./validate");


const id = "https://json-schema.org/keyword/propertyNames";

const compile = (schema, ast) => Validate.compile(schema, ast);

const interpret = (propertyNames, instance, ast, dynamicAnchors) => {
  return !Instance.typeOf(instance, "object") || Instance.keys(instance)
    .every((key) => Validate.interpret(propertyNames, Instance.cons(key), ast, dynamicAnchors));
};

module.exports = { id, compile, interpret };
