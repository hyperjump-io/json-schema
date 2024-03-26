import jsonStringify from "fastest-stable-stringify";
import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/const";

const compile = (schema) => jsonStringify(Browser.value(schema));
const interpret = (const_, instance) => jsonStringify(instance.value()) === const_;

const description = `Validation succeeds if the instance is equal to this keyword’s value.\\
\\
The const keyword in restricts an instance to a specific value. \
Its usage is functionally similar to an enum with a single value. \
Instances validate successfully only if their property value deeply matches the specified constant.
+ Applies to various JSON data types, including numbers, strings, booleans, objects, and arrays.
+ Takes precedence over other validation keywords like type and enum.
## Examples
####  Schema with a specific string value
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "const": "hello"
}
\`\`\`
An instance matching the const value is valid
\`\`\`json
"hello"
\`\`\`
An instance not matching the const value is invalid.
\`\`\`json
"world"
\`\`\``;

export default { id, compile, interpret, description };
