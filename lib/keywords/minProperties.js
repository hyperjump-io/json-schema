import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/minProperties";

const compile = (schema) => Browser.value(schema);
const interpret = (minProperties, instance) => {
  return instance.typeOf() !== "object" || [...instance.keys()].length >= minProperties;
};

const description = `An object instance is valid if its number of properties is greater than, or equal to, the value of this keyword.\\
\\
The minProperties keyword is used to specify the inclusive minimum number of properties allowed in an object instnace. \
If the number of properties in the object is less than the value specified by minProperties, the validation fails.
+ It applies specifically to object instances.
+ The value of this keyword must be a non-negative integer (0 or greater).
+ Omitting this keyword has the same behavior as a value of 0.
## Examples
####  Schema with 'minProperties' keyword
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "minProperties": 1
}
\`\`\`
An instance with 1 or more properties is valid
\`\`\`json
{ "foo": 3, "bar": "hi" }
\`\`\`
An empty instance is invalid
\`\`\`json
{}
\`\`\`
'minProperties' has no effect on values other than objects
\`\`\`json
false
\`\`\``;

export default { id, compile, interpret, description };
