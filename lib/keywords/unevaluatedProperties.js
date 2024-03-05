import { Validation, canonicalUri } from "../experimental.js";


const id = "https://json-schema.org/keyword/unevaluatedProperties";

const compile = async (schema, ast, parentSchema) => {
  return [canonicalUri(parentSchema), await Validation.compile(schema, ast)];
};

const interpret = ([schemaUrl, unevaluatedProperties], instance, ast, dynamicAnchors, quiet) => {
  if (instance.typeOf() !== "object") {
    return true;
  }

  const evaluatedPropertyNames = Validation.collectEvaluatedProperties(schemaUrl, instance, ast, dynamicAnchors, true);
  if (evaluatedPropertyNames === false) {
    return true;
  }

  let isValid = true;
  for (const [propertyName, property] of instance.entries()) {
    if (!evaluatedPropertyNames.has(propertyName.value()) && !Validation.interpret(unevaluatedProperties, property, ast, dynamicAnchors, quiet)) {
      isValid = false;
    }
  }

  return isValid;
};

const collectEvaluatedProperties = ([schemaUrl, unevaluatedProperties], instance, ast, dynamicAnchors) => {
  if (instance.typeOf() !== "object") {
    return true;
  }

  const evaluatedPropertyNames = Validation.collectEvaluatedProperties(schemaUrl, instance, ast, dynamicAnchors, true);

  if (!evaluatedPropertyNames) {
    return false;
  }

  for (const [propertyName, property] of instance.entries()) {
    if (!evaluatedPropertyNames.has(propertyName.value())) {
      if (!Validation.interpret(unevaluatedProperties, property, ast, dynamicAnchors, true)) {
        return false;
      }

      evaluatedPropertyNames.add(propertyName.value());
    }
  }

  return evaluatedPropertyNames;
};

export default { id, compile, interpret, collectEvaluatedProperties };
