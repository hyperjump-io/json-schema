# Sessions

A session retrieves and browses schemas. Everything it finds belongs to
it, including the documents it retrieves and the dialects it builds from
meta-schemas. All of that is thrown away with the session.

An operation given a `JsonSchema`, like `validator` or `bundle`, starts a
new session. Start one yourself to:

- **Compile several schemas with the same documents.** Each document is
  retrieved and checked once per session instead of once per compilation.
- **Browse schemas** with the
  [`@hyperjump/browser`](https://github.com/hyperjump-io/browser/blob/v2/website/README.md)
  API and [follow references](#following-references) in a tool of your
  own.
- **Read annotations** by keyword name with `annotation`. See
  [Annotations](../guides/annotations.md#reading-an-annotation).

```typescript
const session = jsonSchema.session({ registry });

const isPerson = await validator(session, "https://example.com/person");
const isAddress = await validator(session, "https://example.com/address");

const name = await session.get(
  "https://example.com/person#/properties/name"
);
```

Every operation accepts a session in place of the `JsonSchema`. Operations
that use the same session share what it retrieved. A session takes the same
`registry` and `allowRetrieval` options as an operation. An operation given
a session can't take them. A validator doesn't need its session after it's
compiled.

A session sees documents as they were when it first retrieved them. Start
a new session to see changes. HTTP responses are cached across sessions
according to their caching headers.

## Following references

Some tools follow references themselves, like a documentation generator or
a bundler. They find what a reference points to with the session's
`getDocument` or `get`. Use `referencedFrom` to say where the reference is.
It's the URI of the document the reference is in.

```typescript
import type { JsonSchemaDocumentNode } from "@hyperjump/json-schema";
import { visitReferences } from "@hyperjump/json-schema/lint";

const session = jsonSchema.session();
const document = await session.getDocument("https://example.com/person");
if (document.type !== "json-schema-document") {
  throw Error("Not a schema");
}
const person = document as unknown as JsonSchemaDocumentNode;

const references: string[] = [];
visitReferences(person, (uri) => references.push(uri));

for (const uri of references) {
  // The document the schema is in, and the schema's node
  const document = await session.getDocument(uri, { referencedFrom: person.uri });
  const schema = await session.get(uri, { referencedFrom: person.uri });
}
```

`getDocument` finds any document, like a JSON file. Check that it's a
schema before treating it as one. Its type doesn't narrow, so it needs the
cast.

`referencedFrom` matters for a schema embedded in the same document, like
an `$id` in `$defs`. An embedded schema is only found from the document
it's in. Without `referencedFrom`, it isn't found, or a different schema
with the same URI is found instead. Sometimes the schema making the
reference is in more than one document, like a schema that's also in a
bundle. Then an embedded schema is only found if every one of those
documents embeds it. Every other reference is found the usual way: first in
the registries, then by retrieving it.

`visitReferences` finds every reference in a document along with the URI it
refers to. It finds `$ref` in every dialect, 2020-12's `$dynamicRef`, and
2019-09's `$recursiveRef`. In the tree, a reference that's a keyword's
value is a `json` node with the resolved URI as `href`. A draft-04 to
draft-07 `$ref` is a `reference` node with `href`.

Follow references in the session the document is in. That way you only
reach what its registry and `allowRetrieval` allow. In a lint rule, the
session is `file.data.jsonSchemaSession`.
[`findSchema`](lint-rules.md#looking-at-other-schemas) does this for you.
