export default {
    id: "https://json-schema.org/keyword/id",
    description: 
    `This keyword declares an identifier for the schema resource.\\
\\
The \`$id\` keyword declares the URI for a schema, usually set at the top level. \
However, any subschema has the flexibility to declare its own \`$id\` to distinguish itself with a distinct URI. \
Each subschema with an \`$id\` in a compound schema is called a schema resource.
+ The top-level schema resource is referred to as the root schema resource.
+ The identifier of the root schema resource, if set, must be an absolute URI.
+ The presence of an identifier sets a new base URI for such schema resource.\\
\\
It’s worth noting that if the \`$id\` identifier is a URL, it’s common for the URL to \
respond with the schema when accessed through a web browser, but this behavior is not \
mandatory; the URL primarily serves as an identifier. Additionally, for non-locatable \
URIs, such as those not intended for direct accessibility over the declared protocol \
(e.g., HTTPS), it is advisable to consider using URNs.\\
\\
Note: Check out the URI RFC to gain a deeper understanding of how resolution works, \
providing valuable insights into the essential role of URIs in JSON Schema.`
}
