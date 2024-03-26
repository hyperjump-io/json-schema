import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/dependentRequired";

const compile = (schema) => pipe(
  Browser.entries(schema),
  asyncMap(([key, dependentRequired]) => [key, Browser.value(dependentRequired)]),
  asyncCollectArray
);

const interpret = (dependentRequired, instance) => {
  if (instance.typeOf() !== "object") {
    return true;
  }

  let isValid = true;
  for (const [propertyName, required] of dependentRequired) {
    if (instance.has(propertyName) && !required.every((key) => instance.has(key))) {
      isValid = false;
    }
  }

  return isValid;
};

const description = `Validation succeeds if, for each name that appears in both the instance and as a name within this keyword’s value, \
every item in the corresponding array is also the name of a property in the instance.\\
\\
The dependentRequired keyword specifies a conditional dependency between properties within an instance. \
It ensures that if a certain property is present in an instance, then another specified set of properties must also be present. \
In short, if property A exists in an instance, then properties B, C, and D must also be present.
+ The value of this keyword must be an object.
+ Properties in this object, if any, must be arrays.
+ Items in each array, if any, must be strings, and must be unique.
## Examples
####  Schema with the 'dependentRequired' keyword
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "age": { "type": "integer" },
      "license": { "type": "string" }
    },
    "dependentRequired": {
      "license": [ "age" ]
    }
}
\`\`\`
An instance with both 'age' and 'license' properties is valid
\`\`\`json
{
    "name": "John",
    "age": 25,
    "license": "XYZ123"
}
\`\`\`
An instance with missing 'age' property when 'license' property is present is invalid
\`\`\`json
{
    "name": "John",
    "license": "XYZ123"
}
\`\`\`
An instance without 'license' property is valid
\`\`\`json
{
    "name": "John",
    "age": 25
}
\`\`\`
An empty object is also valid
\`\`\`json
{}
\`\`\``;

export default { id, compile, interpret, description };
