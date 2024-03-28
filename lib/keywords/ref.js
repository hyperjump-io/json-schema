import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/ref";

const compile = Validation.compile;
const interpret = Validation.interpret;
const collectEvaluatedProperties = Validation.collectEvaluatedProperties;
const collectEvaluatedItems = Validation.collectEvaluatedItems;
const description = `This keyword is used to reference a statically identified schema. \
This is useful for avoiding code duplication and promoting modularity when describing \
complex data structures.
+ The value of $ref is set to a URI reference, which may be either relative or absolute according to RFC 3986.
+ A URI reference may include a JSON Pointer in a URI fragment (e.g., #/foo/bar).\\
\\
For examples and more information visit https://www.learnjsonschema.com/2020-12/core/ref/`;

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems, description };
