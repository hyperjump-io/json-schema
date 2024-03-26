import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/maxLength";

const compile = (schema) => Browser.value(schema);
const interpret = (maxLength, instance) => instance.typeOf() !== "string" || [...instance.value()].length <= maxLength;

const description = `A string instance is valid against this keyword if its length is less than, or equal to, the value of this keyword.\\
\\
The maxLength keyword is used to specify the maximum length of a string instance. \
It is used to enforce a constraint on the maximum number of characters allowed for a string instance.
+ Applies only to string data types.
+ Value must be a non-negative integer.
+ String length is counted in characters, not bytes.
+ Validation succeeds if the string length is less than or equal to the specified maxLength.
## Examples
####  Schema restricting string length to a maximum of 10 characters
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "string",
    "maxLength": 10
}
\`\`\`
An instance with a string length less than or equal to 10 is valid
\`\`\`json
"foo"
\`\`\`
An instance with a string length greater than 10 is invalid
\`\`\`json
"This is an invalid string"
\`\`\``;

export default { id, compile, interpret, description };
