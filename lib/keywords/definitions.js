import * as Browser from "@hyperjump/browser";
import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import Validation from "./validation.js";


const id = "https://json-schema.org/keyword/definitions";

const compile = (schema, ast) => pipe(
  Browser.values(schema),
  asyncMap((definitionSchema) => Validation.compile(definitionSchema, ast)),
  asyncCollectArray
);

const interpret = () => true;

const description = `The $defs keyword provides a standardized way to define reusable subschemas within a \
single schema document, promoting modularity, reducing code duplication, and improving \
schema organization. Each subschema within $defs has a unique name, acting as a location \
for referencing, without directly affecting validation; its value must be a valid JSON Schema.
## Examples
#### Schema that describes the age of a person
\`\`\`json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "age": {
      "$ref": "#/$defs/positiveInteger"
    }
  },
  "$defs": {
    "positiveInteger": {
      "type": "integer",
      "minimum": 0
    }
  }
}
\`\`\`
Valid: The instance has a valid "age" property that meets the requirement specified \
in the "/$defs/positiveInteger" subschema
\`\`\`json
{ "age": 25 }
\`\`\`
Invalid: A string is not an integer
\`\`\`json
{ "age": "some_string" }
\`\`\`
`;

export default { id, compile, interpret, description };
