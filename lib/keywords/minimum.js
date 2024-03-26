import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/minimum";

const compile = (schema) => Browser.value(schema);
const interpret = (minimum, instance) => instance.typeOf() !== "number" || instance.value() >= minimum;

const description = `Validation succeeds if the numeric instance is greater than or equal to the given number.\\
\\
The minimum keyword is used to set the lower limit on numeric instances. \
It specifies that the numeric value being validated must be greater than or equal to the provided minimum value.
+ Applies only to number data types (integers and floats).
+ Validation succeeds if the number is greater than or equal to the specified minimum.
## Examples
####  Schema defining the lower limit of 6 on numeric values
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "number",
    "minimum": 6
}
\`\`\`
An instance with a numeric value greater than 6 is valid
\`\`\`json
8.1
\`\`\`
An instance with a numeric value less than 6 is invalid
\`\`\`json
4
\`\`\`
An instance with a numeric value equal to 6 is valid
\`\`\`json
6
\`\`\``;

export default { id, compile, interpret, description };
