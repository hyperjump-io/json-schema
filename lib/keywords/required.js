import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/required";

const compile = (schema) => Browser.value(schema);

const interpret = (required, instance) => {
  return instance.typeOf() !== "object" || required.every((propertyName) => Object.hasOwn(instance.value(), propertyName));
};

const description = `An object instance is valid against this keyword if every item in the array is the name of a property in the instance.\\
\\
The required keyword is used to specify which properties must be present within an object instance.
+ The value of this keyword must be an array.
+ Elements of this array, if any, must be strings, and must be unique.
+ Omitting this keyword has the same behavior as an empty array.
## Examples
####  Schema with the 'required' keyword
\`\`\`json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": [ "foo" ]
}
\`\`\`
An instance with all the required properties is valid
\`\`\`json
{ "foo": "bar" }
\`\`\`
An instance with missing required properties is invalid
\`\`\`json
{ "bar": false }
\`\`\`
An instance with all the required properties is valid
\`\`\`json
{ "foo": [ "bar" ], "baz": 13 }
\`\`\`
+ It is important to note that when the required properties are not defined in the properties, \
then the only requirement to make the instance valid is to have those properties present in the instance irrespective of their value’s datatype.`;

export default { id, compile, interpret, description };
