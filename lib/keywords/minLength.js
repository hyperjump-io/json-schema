import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/minLength";

const compile = (schema) => Browser.value(schema);
const interpret = (minLength, instance) => instance.typeOf() !== "string" || [...instance.value()].length >= minLength;

const description = `A string instance is valid against this keyword if its length is greater than, or equal to, the value of this keyword.\\
\\
The minLength keyword is used to specify the minimum length of a string instance. \
It defines the minimum number of characters that a valid string must have to satisfy the schema.
+ Applies only to string data types.
+ Value must be a non-negative integer.
+ String length is counted in characters, not bytes.
+ Validation succeeds if the string length is greater than or equal to the specified minLength.
## Examples
####  Schema requiring minimum string length of 5
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "string",
    "minLength": 5
}
\`\`\`
An instance with a string length greater than or equal to 5 is valid
\`\`\`json
"This is a valid string"
\`\`\`
An instance with a string length less than 5 is invalid
\`\`\`json
"foo"
\`\`\``;

export default { id, compile, interpret, description };
