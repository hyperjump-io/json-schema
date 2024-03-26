import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/exclusiveMinimum";

const compile = (schema) => Browser.value(schema);
const interpret = (exclusiveMinimum, instance) => instance.typeOf() !== "number" || instance.value() > exclusiveMinimum;

const description = `Validation succeeds if the numeric instance is greater than the given number.\\
\\
The exclusiveMinimum keyword is used to set an exclusive lower limit on numeric instances. \
It specifies that the numeric value being validated must be strictly greater than (not equal to) the provided minimum value.
+ Applies only to number data types (integers and real numbers).
+ Validation succeeds if the number is strictly greater than the specified exclusiveMinimum.
## Examples
####  Schema defining exclusive lower limit of 5 on numeric values
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "number",
    "exclusiveMinimum": 5
}
\`\`\`
An instance with numeric value less than 5 is invalid
\`\`\`json
3
\`\`\`
An instance with numeric value greater than 5 is valid
\`\`\`json
9.5
\`\`\`
An instance with numeric value equal to 5 is invalid
\`\`\`json
5
\`\`\``;

export default { id, compile, interpret, description };
