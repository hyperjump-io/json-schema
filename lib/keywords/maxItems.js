import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/maxItems";

const compile = (schema) => Browser.value(schema);
const interpret = (maxItems, instance) => instance.typeOf() !== "array" || instance.length() <= maxItems;

const description = `An array instance is valid if its size is less than, or equal to, the value of this keyword.\\
\\
The maxItems keyword is used to specify the maximum number of items allowed in an array. \
It can be used to define constraints on the size of an array within an array instance.
+ Applies to arrays only.
+ Value must be a non-negative integer.
+ An array is valid if it has less than or equal to the specified number of elements.
+ Omitting maxItems means the array has no upper limit (unbounded).
## Examples
####  Schema with 'maxItems' keyword
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "array",
    "maxItems": 3
}
\`\`\`
An array instance with 3 or less items is valid
\`\`\`json
[ 1, true, "hello" ]
\`\`\`
An array instance with more than 3 items is invalid
\`\`\`json
[ 1, 2, "apple", "banana", true ]
\`\`\``;

export default { id, compile, interpret, description };
