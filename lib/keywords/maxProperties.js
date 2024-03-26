import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/maxProperties";

const compile = (schema) => Browser.value(schema);
const interpret = (maxProperties, instance) => {
  return instance.typeOf() !== "object" || [...instance.keys()].length <= maxProperties;
};

const description = `An object instance is valid if its number of properties is less than, or equal to, the value of this keyword.\\
\\
The maxProperties keyword is used to specify the maximum number of properties allowed in an object instnace. \
It is typically used to enforce constraints on the number of properties an object instance can have. \
If the number of properties in the object exceeds the value specified by maxProperties, the validation fails.
+ It applies specifically to object instances.
+ The value of this keyword must be a non-negative integer (0 or greater).
+ Setting maxProperties to 0 enforces an empty object instance.
## Examples
####  Schema with 'maxProperties' keyword
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "maxProperties": 2
}
\`\`\`
An instance with 2 or less properties is valid
\`\`\`json
{ "foo": 3, "bar": "hi" }
\`\`\`
'minProperties' has no effect on values other than objects
\`\`\`json
false
\`\`\`
An instance with more than 2 properties is invalid
\`\`\`json
{ "foo": 3, "bar": "hi", "baz": true }
\`\`\``;

export default { id, compile, interpret, description };
