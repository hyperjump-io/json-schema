import { Validation } from "../experimental.js";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/unevaluatedProperties";

const compile = (schema, ast) => Validation.compile(schema, ast);

const interpret = (unevaluatedProperties, instance, context) => {
  if (Instance.typeOf(instance) !== "object") {
    return true;
  }

  const evaluatedProperties = context.schemaEvaluatedProperties;

  let isValid = true;
  for (const [propertyNameNode, property] of Instance.entries(instance)) {
    const propertyName = Instance.value(propertyNameNode);
    if (evaluatedProperties.has(propertyName)) {
      continue;
    }

    if (!Validation.interpret(unevaluatedProperties, property, context)) {
      isValid = false;
    }

    context.evaluatedProperties?.add(propertyName);
  }

  return isValid;
};

const simpleApplicator = true;

const plugin = {
  beforeSchema(_url, _instance, context) {
    context.evaluatedProperties ??= new Set();
    context.schemaEvaluatedProperties = new Set();
  },

  beforeKeyword(_node, _instance, context, schemaContext) {
    context.evaluatedProperties = new Set();
    context.schemaEvaluatedProperties = schemaContext.schemaEvaluatedProperties;
  },

  afterKeyword(_node, _instance, context, _valid, schemaContext) {
    for (const property of context.evaluatedProperties) {
      schemaContext.schemaEvaluatedProperties.add(property);
    }
  },

  afterSchema(_node, _instance, context, valid) {
    if (valid) {
      for (const property of context.schemaEvaluatedProperties) {
        context.evaluatedProperties.add(property);
      }
    }
  }
};

export default { id, compile, interpret, simpleApplicator, plugin };
