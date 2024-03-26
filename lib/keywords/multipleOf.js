import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/multipleOf";

const compile = (schema) => Browser.value(schema);

const interpret = (multipleOf, instance) => {
  if (instance.typeOf() !== "number") {
    return true;
  }

  const remainder = instance.value() % multipleOf;
  return numberEqual(0, remainder) || numberEqual(multipleOf, remainder);
};

const numberEqual = (a, b) => Math.abs(a - b) < 1.19209290e-7;

const description = `A numeric instance is valid only if division by this keyword’s value results in an integer.\\
\\
The multipleOf keyword is used to specify that an instance must be a multiple of a given number. \
The value of this keyword must be strictly greater than zero.
+ Applicable only to number and integer type.
+ Validates if an instance is divisible by the specified number.
+ Setting multipleOf to 0 is not valid.
## Examples
####  Schema with 'multipleOf' set to an integer
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "multipleOf": 5
}
\`\`\`
A numeric instance that is a multiple of 5 is valid
\`\`\`json
10
\`\`\`
A numeric instance that is not a multiple of 5 is invalid.
\`\`\`json
8
\`\`\`
-15 is a multiple of 5
\`\`\`json
-15
\`\`\`
An instance with a string value is valid
\`\`\`json
"foo"
\`\`\``;

export default { id, compile, interpret, description };
