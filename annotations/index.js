import { ValidationError } from "./validation-error.js";
import { getSchema, compile, BASIC } from "../lib/experimental.js";
import Validation from "../lib/keywords/validation.js";
import * as Instance from "../lib/instance.js";


export const annotate = async (schemaUri, json = undefined, outputFormat = undefined) => {
  const schema = await getSchema(schemaUri);
  const compiled = await compile(schema);
  const interpretAst = (json, outputFormat) => interpret(compiled, Instance.fromJs(json), outputFormat);

  return json === undefined ? interpretAst : interpretAst(json, outputFormat);
};

export const interpret = ({ ast, schemaUri }, instance, outputFormat = BASIC) => {
  const errors = [];
  const annotations = [];
  const valid = Validation.interpret(schemaUri, instance, { ast, schemaUri, dynamicAnchors: {}, errors, annotations });

  if (!valid) {
    const result = outputFormat === BASIC && !valid ? { valid, errors } : { valid };
    throw new ValidationError(result);
  }

  for (const annotation of annotations) {
    const node = Instance.get(annotation.instanceLocation, instance);
    const keyword = annotation.keyword;
    if (!node.annotations[keyword]) {
      node.annotations[keyword] = [];
    }
    node.annotations[keyword].push(annotation.annotation);
  }

  return instance;
};

export { ValidationError } from "./validation-error.js";
