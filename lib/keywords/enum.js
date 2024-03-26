import jsonStringify from "fastest-stable-stringify";
import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/enum";

const compile = (schema) => pipe(
  Browser.iter(schema),
  asyncMap(Browser.value),
  asyncMap(jsonStringify),
  asyncCollectArray
);

const interpret = (enum_, instance) => {
  const instanceValue = jsonStringify(instance.value());
  return enum_.some((enumValue) => instanceValue === enumValue);
};

const description = `Validation succeeds if the instance is equal to one of the elements in this keyword’s array value. \\
\\
The enum keyword specifies a validation constraint for an instance, defining a set of permissible values. \
The value of the enum keyword must be an array containing at least one element, and these elements should be unique. \
The validation succeeds if the value of the instance matches one of the elements in the enum array.
## Examples
####  Schema with string enum
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "enum": [ "red", "green", "blue" ]
}
\`\`\`
Instance with value present in the enum is valid
\`\`\`json
"green"
\`\`\`
Instance with value not present in the enum is invalid
\`\`\`json
"black"
\`\`\``;

export default { id, compile, interpret, description };
