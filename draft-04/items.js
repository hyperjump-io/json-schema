import * as Instance from "../lib/instance.js";
import * as Schema from "../lib/schema.js";
import Validate from "../lib/keywords/validate.js";


const id = "https://json-schema.org/keyword/draft-04/items";

const compile = async (schema, ast) => {
  if (Schema.typeOf(schema, "array")) {
    const tupleItems = await Schema.map((itemSchema) => Validate.compile(itemSchema, ast), schema);
    return Promise.all(tupleItems);
  } else {
    return Validate.compile(schema, ast);
  }
};

const interpret = (items, instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  if (typeof items === "string") {
    return Instance.every((itemValue) => Validate.interpret(items, itemValue, ast, dynamicAnchors), instance);
  } else {
    return Instance.every((item, ndx) => !(ndx in items) || Validate.interpret(items[ndx], item, ast, dynamicAnchors), instance);
  }
};

const collectEvaluatedItems = (items, instance, ast, dynamicAnchors) => {
  return interpret(items, instance, ast, dynamicAnchors) && (typeof items === "string"
    ? new Set(Instance.map((item, itemIndex) => itemIndex, instance))
    : new Set(items.map((item, itemIndex) => itemIndex)));
};

export default { id, compile, interpret, collectEvaluatedItems };
