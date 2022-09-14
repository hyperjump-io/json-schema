const Schema = require("../schema");
const Instance = require("../instance");
const Validate = require("./validate");


const id = "https://json-schema.org/keyword/unevaluatedProperties";

const compile = async (schema, ast, parentSchema) => {
  return [Schema.uri(parentSchema), await Validate.compile(schema, ast)];
};

const interpret = ([schemaUrl, unevaluatedProperties], instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "object")) {
    return true;
  }

  const evaluatedPropertyNames = Validate.collectEvaluatedProperties(schemaUrl, instance, ast, dynamicAnchors, true);

  return !evaluatedPropertyNames || Instance.entries(instance)
    .filter(([propertyName]) => !evaluatedPropertyNames.some((pattern) => propertyName.match(pattern)))
    .every(([, property]) => Validate.interpret(unevaluatedProperties, property, ast, dynamicAnchors));
};

const collectEvaluatedProperties = (keywordValue, instance, ast, dynamicAnchors) =>{
  return interpret(keywordValue, instance, ast, dynamicAnchors) && [new RegExp("")];
};

module.exports = { id, compile, interpret, collectEvaluatedProperties };
