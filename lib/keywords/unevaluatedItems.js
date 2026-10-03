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
  id: `${id}#plugin`,
  beforeSchema(_url, instance, context) {
    context.evaluatedItems ??= new Set();
    context.schemaEvaluatedItems = new Set();
    context.instanceNode ??= instance;
  },

  beforeKeyword(_node, instance, context, schemaContext) {
    // Everything a keyword evaluates counts as evaluated by the schema, so keywords add directly to the schema's set
    context.evaluatedItems = schemaContext.schemaEvaluatedItems;
    context.schemaEvaluatedItems = schemaContext.schemaEvaluatedItems;
    context.instanceNode = instance;
  },

  afterSchema(_node, instance, context, valid) {
    if (valid && instance === context.instanceNode) {
      for (const property of context.schemaEvaluatedItems) {
        context.evaluatedItems.add(property);
      }
    }
  }
};

export default { id, compile, interpret, simpleApplicator, plugin };
