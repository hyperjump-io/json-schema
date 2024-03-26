import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/minItems";

const compile = (schema) => Browser.value(schema);
const interpret = (minItems, instance) => instance.typeOf() !== "array" || instance.length() >= minItems;

const description = `An array instance is valid if its size is greater than, or equal to, the value of this keyword.\\
\\
The minItems keyword specifies the minimum number of items that must be present in an array. \
It can be used to define constraints on the size of an array, ensuring that it contains at least a certain number of elements.
+ Applies to arrays only.
+ Value must be a non-negative integer.
+ An array is valid if it has at least the specified number of elements.
+ Omitting minItems keyword has the same behavior as a value of 0.
## Examples
####  Schema with 'minItems' keyword
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "array",
    "minItems": 3
}
\`\`\`
An array instance with 3 or more elements is valid
\`\`\`json
[ 1, true, "hello" ]
\`\`\`
An array instance with less than 3 elements is invalid
\`\`\`json
[ 1, "apple" ]
\`\`\``;

export default { id, compile, interpret, description };
