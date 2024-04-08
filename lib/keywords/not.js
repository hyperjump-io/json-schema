import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/not";
const description = `An instance is valid against this keyword if it fails to validate \
successfully against the schema defined by this keyword.`;

const compile = Validation.compile;
const interpret = (not, instance, ast, dynamicAnchors, quiet) => !Validation.interpret(not, instance, ast, dynamicAnchors, quiet);

export default { id, compile, interpret, description };
