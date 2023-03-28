import * as Instance from "../lib/instance.js";
import * as Schema from "../lib/schema.js";
import Validation from "../lib/keywords/validation.js";


const id = "https://json-schema.org/keyword/draft-04/items";

const compile = async (schema, ast) => {
  if (Schema.typeOf(schema, "array")) {
    const tupleItems = await Schema.map((itemSchema) => Validation.compile(itemSchema, ast), schema);
    return Promise.all(tupleItems);
  } else {
    return Validation.compile(schema, ast);
  }
};

const interpret = (items, instance, ast, dynamicAnchors, quiet) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  if (typeof items === "string") {
    return Instance.every((itemValue) => Validation.interpret(items, itemValue, ast, dynamicAnchors), instance, quiet);
  } else {
    return Instance.every((item, ndx) => !(ndx in items) || Validation.interpret(items[ndx], item, ast, dynamicAnchors), instance, quiet);
  }
};

const collectEvaluatedItems = (items, instance, ast, dynamicAnchors) => {
  return interpret(items, instance, ast, dynamicAnchors) && (typeof items === "string"
    ? new Set(Instance.map((item, itemIndex) => itemIndex, instance))
    : new Set(items.map((item, itemIndex) => itemIndex)));
};

export default { id, compile, interpret, collectEvaluatedItems };
