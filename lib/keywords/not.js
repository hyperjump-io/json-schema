import Validation from "./validation.js";


const id = "https://json-schema.org/keyword/not";

const compile = Validation.compile;
const interpret = (not, instance, ast, dynamicAnchors) => !Validation.interpret(not, instance, ast, dynamicAnchors);

export default { id, compile, interpret };
