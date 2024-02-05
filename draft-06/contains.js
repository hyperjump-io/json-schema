import { some } from "@hyperjump/pact";
import { Validation } from "../lib/experimental.js";


const id = "https://json-schema.org/keyword/draft-06/contains";

const compile = (schema, ast) => Validation.compile(schema, ast);

const interpret = (contains, instance, ast, dynamicAnchors, quiet) => {
  return instance.typeOf() !== "array" || some((item) => Validation.interpret(contains, item, ast, dynamicAnchors, quiet), instance.iter());
};

export default { id, compile, interpret };
