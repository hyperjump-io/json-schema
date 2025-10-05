import { Validation } from "../experimental.js";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/unevaluatedItems";

const compile = (schema, ast) => Validation.compile(schema, ast);

const interpret = (unevaluatedItems, instance, context) => {
  if (Instance.typeOf(instance) !== "array") {
    return true;
  }

  const evaluatedItems = context.schemaEvaluatedItems;

  let isValid = true;
  let index = 0;
  for (const item of Instance.iter(instance)) {
    if (!evaluatedItems.has(index)) {
      if (!Validation.interpret(unevaluatedItems, item, context)) {
        isValid = false;
      }

      context.evaluatedItems?.add(index);
    }

    index++;
  }

  return isValid;
};

const simpleApplicator = true;

const plugin = {
  beforeSchema(_url, _instance, context) {
    context.evaluatedItems ??= new Set();
    context.schemaEvaluatedItems = new Set();
  },

  beforeKeyword(_node, _instance, context, schemaContext) {
    context.evaluatedItems = new Set();
    context.schemaEvaluatedItems = schemaContext.schemaEvaluatedItems;
  },

  afterKeyword(_node, _instance, context, _valid, schemaContext) {
    for (const property of context.evaluatedItems) {
      schemaContext.schemaEvaluatedItems.add(property);
    }
  },

  afterSchema(_node, _instance, context, valid) {
    if (valid) {
      for (const property of context.schemaEvaluatedItems) {
        context.evaluatedItems.add(property);
      }
    }
  }
};

export default { id, compile, interpret, simpleApplicator, plugin };
