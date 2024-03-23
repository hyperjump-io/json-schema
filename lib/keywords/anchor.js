export default {
    id: "https://json-schema.org/keyword/anchor",
    description: `This keyword is used to create plain name fragments \
that are not tied to any particular structural location for referencing \
purposes, which are taken into consideration for static referencing.\\
\\
The $anchor keyword is used to assign a unique identifier to a subschema within its \
schema resource. This identifier can then be referenced elsewhere using the $ref keyword.
+ Its value must be a valid identifier starting with a letter and containing letters, digits, hyphens, underscores, colons, or periods.
+ The $anchor keyword allows for the creation of plain reusable name fragments that aren’t tied to specific structural locations, offering a flexible alternative to using JSON Pointer fragments, which require knowledge of the schema’s structure.
+ An anchor is resolved against the base URI of its schema resource.
## Examples
####  Schema with a named anchor (identifier)
\`\`\`json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$ref": "#string",
    "$defs": {
      "string": {
        "$anchor": "string",
        "type": "string"
      }
    }
}
\`\`\`
An instance with a string is valid
\`\`\`json
"Hello World!"
\`\`\`
An instance with a number is invalid
\`\`\`json
44
\`\`\``
};
