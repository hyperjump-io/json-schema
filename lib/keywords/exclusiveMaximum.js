import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/exclusiveMaximum";

const compile = (schema) => Browser.value(schema);
const interpret = (exclusiveMaximum, instance) => instance.typeOf() !== "number" || instance.value() < exclusiveMaximum;

const description = `Validation succeeds if the numeric instance is less than the given number.\\
\\
The exclusiveMaximum keyword is used to set an exclusive upper limit on numeric instances. \
It specifies that the numeric value being validated must be strictly less than (not equal to) the provided maximum value.
+ Applies only to number data types (integers and real numbers).
+ Validation succeeds if the number is strictly less than the specified exclusiveMaximum.
## Examples
####  Schema defining exclusive upper limit of 10 on numeric values
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "number",
    "exclusiveMaximum": 10
}
\`\`\`
An instance with numeric value greater than 10 is invalid
\`\`\`json
15
\`\`\`
An instance with numeric value less than 10 is valid
\`\`\`json
9.5
\`\`\`
An instance with numeric value equal to 10 is invalid
\`\`\`json
10
\`\`\``;

export default { id, compile, interpret, description };
