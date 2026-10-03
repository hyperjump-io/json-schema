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
  id: `${id}#plugin`,
  beforeSchema(_url, instance, context) {
    context.evaluatedProperties ??= new Set();
    context.schemaEvaluatedProperties = new Set();
    context.instanceNode ??= instance;
  },

  beforeKeyword(_node, instance, context, schemaContext) {
    // Everything a keyword evaluates counts as evaluated by the schema, so keywords add directly to the schema's set
    context.evaluatedProperties = schemaContext.schemaEvaluatedProperties;
    context.schemaEvaluatedProperties = schemaContext.schemaEvaluatedProperties;
    context.instanceNode = instance;
  },

  afterSchema(_node, instance, context, valid) {
    if (valid && instance === context.instanceNode) {
      for (const property of context.schemaEvaluatedProperties) {
        context.evaluatedProperties.add(property);
      }
    }
  }
};

export default { id, compile, interpret, simpleApplicator, plugin };
