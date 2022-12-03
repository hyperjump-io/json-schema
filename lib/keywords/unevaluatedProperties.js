import * as Schema from "../schema.js";
import * as Instance from "../instance.js";
import Validate from "./validate.js";


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

export default { id, compile, interpret, collectEvaluatedProperties };
