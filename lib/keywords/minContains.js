import metaData from "./meta-data.js";


const description = `The number of times that the contains keyword (if set) successfully validates against the instance must be greater than or equal to the given integer.\\
\\
The minContains keyword is used in conjunction with the contains keyword to specify the minimum number of items in an array instance that must validate against the contains subschema.
+ This keyword applies only to arrays.
+ The value of this keyword must be a non-negative integer.
+ If contains is not present within the same schema object, then this keyword has no effect.
## Examples
####  Schema with the 'minContains' and 'contains' keyword
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "array",
    "contains": { "type": "string" },
    "minContains": 2
}
\`\`\`
An array instance with 2 or more items successfully validating against the 'contains' subschema is valid
\`\`\`json
[ "Car", "Bus", 1, 2, "Bike" ]
\`\`\`
An array instance with less than 2 items successfully validating against the 'contains' subschema is invalid
\`\`\`json
[ "Car", 1 ]
\`\`\`
An empty array is invalid
\`\`\`json
[]
\`\`\``;

export default { id: "https://json-schema.org/keyword/minContains", ...metaData, description };
