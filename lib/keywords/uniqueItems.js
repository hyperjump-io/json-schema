import jsonStringify from "fastest-stable-stringify";
import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/uniqueItems";

const compile = (schema) => Browser.value(schema);

const interpret = (uniqueItems, instance) => {
  if (instance.typeOf() !== "array" || uniqueItems === false) {
    return true;
  }

  const normalizedItems = instance.value().map(jsonStringify);
  return new Set(normalizedItems).size === normalizedItems.length;
};

const description = `If this keyword is set to the boolean value true, the instance validates successfully if all of its elements are unique.\\
\\
The uniqueItems keyword is used to ensure that all the items in an array are unique. \
This keyword is particularly useful when you need to enforce that an array contains no duplicate elements.
+ The value of this keyword must be a boolean.
+ This keyword, when set to true, specifies that all elements in an array must be unique.
+ If it is set to false, the array can contain duplicate items.
+ Omitting this keyword has the same behavior as a value of false.
## Examples
####  Schema with 'uniqueItems' property set to true
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "array",
    "uniqueItems": true
}
\`\`\`
An array instance with unique elements is valid
\`\`\`json
[ 1, "hello", true ]
\`\`\`
An instance with duplicate elements is invalid
\`\`\`json
[ false, "world", 2, 2 ]
\`\`\`
An instance with duplicate complex structures (objects) is invalid
\`\`\`json
[ { "name": "John" }, false, "world", 2, { "name": "John" } ]
\`\`\``;

export default { id, compile, interpret, description };
