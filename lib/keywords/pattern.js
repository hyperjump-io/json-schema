import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/pattern";

const compile = (schema) => new RegExp(Browser.value(schema), "u");
const interpret = (pattern, instance) => instance.typeOf() !== "string" || pattern.test(instance.value());

const description = `A string instance is considered valid if the regular expression matches the instance successfully.\\
\\
The pattern keyword in JSON Schema is designed to define a regular expression pattern that a string value within an instance must adhere to. \
This regular expression is specified as a string for the pattern keyword. It functions as follows:
+ Assigns a regular expression (following ECMA-262 dialect) to the pattern keyword to define the required format.
+ A string value is considered valid only if it successfully matches the specified pattern.
+ The regular expressions used with pattern are not implicitly anchored, requiring a complete match for validation. Partial matches are not accepted.
## Examples
####  Schema with regular expression for email validation
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "string",
    "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
}
\`\`\`
An instance adhering to the regular expression is valid
\`\`\`json
"john.doe@example.com"
\`\`\`
An instance not adhering to the regular expression is invalid
\`\`\`json
"invalid@yahoo"
\`\`\``;

export default { id, compile, interpret, description };
