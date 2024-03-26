import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/ref";

const compile = Validation.compile;
const interpret = Validation.interpret;
const collectEvaluatedProperties = Validation.collectEvaluatedProperties;
const collectEvaluatedItems = Validation.collectEvaluatedItems;
const description = `This keyword is used to reference a statically identified schema.\\
\\
The $ref keyword is used to statically reference a schema. This is useful for avoiding \
code duplication and promoting modularity when describing complex data structures.
+ The value of $ref is set to a URI reference, which may be either relative or absolute according to RFC 3986.
+ A URI reference may include a JSON Pointer in a URI fragment (e.g., #/foo/bar).\\
Note: It’s crucial to understand that an absolute URI does not necessarily denote a remote \
reference. An absolute URI can point to a local schema if the schema declares nested $ids or \
if it points to itself. Conversely, a relative URI can point to a remote schema by leveraging \
base URI resolution.`;

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems, description };
