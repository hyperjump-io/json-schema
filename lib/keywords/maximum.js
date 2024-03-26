import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/maximum";

const compile = (schema) => Browser.value(schema);
const interpret = (maximum, instance) => instance.typeOf() !== "number" || instance.value() <= maximum;

const description = `Validation succeeds if the numeric instance is less than or equal to the given number.\\
\\
The maximum keyword is used to set the upper limit on numeric instances. \
It specifies that the numeric value being validated must be less than or equal to the provided maximum value.
+ Applies only to number data types (integers and floats).
+ Validation succeeds if the number is less than or equal to the specified maximum.
## Examples
####  Schema defining the upper limit of 10 on numeric values
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "number",
    "maximum": 10
}
\`\`\`
An instance with a numeric value less than 10 is valid
\`\`\`json
9.5
\`\`\`
An instance with a numeric value greater than 10 is invalid
\`\`\`json
15
\`\`\`
An instance with a numeric value equal to 10 is valid
\`\`\`json
10
\`\`\``;

export default { id, compile, interpret, description };
