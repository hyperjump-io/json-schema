import Validate from "./validate.js";


const id = "https://json-schema.org/keyword/not";

const compile = Validate.compile;
const interpret = (not, instance, ast, dynamicAnchors) => !Validate.interpret(not, instance, ast, dynamicAnchors);

export default { id, compile, interpret };
