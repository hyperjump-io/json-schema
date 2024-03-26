import metaData from "./meta-data.js";


const description = `The number of times that the contains keyword (if set) successfully validates against the instance must be less than or equal to the given integer.\\
\\
The maxContains keyword is used in conjunction with the contains keyword to specify the maximum number of items in an array instance that must validate against the contains subschema.
+ This keyword applies only to arrays.
+ The value of this keyword must be a non-negative integer.
+ If contains is not present within the same schema object, then this keyword has no effect.
## Examples
####  Schema with the 'maxContains' and 'contains' keyword
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "array",
    "contains": { "type": "string" },
    "maxContains": 2
}
\`\`\`
An array instance with 2 or less items successfully validating against the 'contains' subschema is valid
\`\`\`json
[ "Car", "Bus", 1, 2 ]
\`\`\`
An array instance with more than 2 items successfully validating against the 'contains' subschema is invalid
\`\`\`json
[ "Car", "Bus", 1, 2, "Bike" ]
\`\`\``;

export default { id: "https://json-schema.org/keyword/maxContains", ...metaData, description };
