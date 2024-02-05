import { pipe, filter, every } from "@hyperjump/pact";
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

  return !evaluatedPropertyNames || pipe(
    instance.entries(),
    filter(([propertyName]) => !evaluatedPropertyNames.has(propertyName)),
    every(([, property]) => Validation.interpret(unevaluatedProperties, property, ast, dynamicAnchors, quiet))
  );
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
    if (!evaluatedPropertyNames.has(propertyName)) {
      if (!Validation.interpret(unevaluatedProperties, property, ast, dynamicAnchors, true)) {
        return false;
      }

      evaluatedPropertyNames.add(propertyName);
    }
  }

  return evaluatedPropertyNames;
};

export default { id, compile, interpret, collectEvaluatedProperties };
