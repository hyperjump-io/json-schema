# Sessions

A session retrieves and browses schemas. Everything it finds belongs to
it: the documents it retrieves and the dialects it builds from
meta-schemas. It's thrown away with the session.

An operation given a `JsonSchema`, like `validator` or `bundle`, starts a
new session. Start one yourself to:

- **Compile several schemas with the same documents.** Each is retrieved and
  checked once for the session, instead of once per compilation.
- **Browse schemas** with the
  [`@hyperjump/browser`](https://github.com/hyperjump-io/browser/blob/v2/website/README.md)
  API, and [follow references](#following-references) in a tool of your
  own.
- **Read annotations** by keyword name, with `annotation` (see
  [Annotations](../guides/annotations.md#reading-an-annotation)).

```typescript
const session = jsonSchema.session({ registry });

const isPerson = await validator(session, "https://example.com/person");
const isAddress = await validator(session, "https://example.com/address");

const name = await session.get(
  "https://example.com/person#/properties/name"
);
```

Every operation takes a session in place of the `JsonSchema`, so they share
what it retrieved. A session takes the same `registry` and
`allowRetrieval` options as an operation, and an operation given a session
can't take them. A validator doesn't need its session after it's compiled.

A session sees documents as they were when it first retrieved them, so
start a new one to see changes. Responses from HTTP are cached across
sessions by their caching headers.

## Following references

A tool that follows references itself, like a documentation generator or
a bundler, finds what a reference points to with the session's
`getDocument` or `get`. Say where the reference is with `referencedFrom`:
the URI of the document it's in.

```typescript
import { visitReferences } from "@hyperjump/json-schema/lint";

const session = jsonSchema.session();
const person = await session.getDocument("https://example.com/person");

const references = [];
visitReferences(person, (uri) => references.push(uri));

for (const uri of references) {
  // The document the schema is in, and the schema's node
  const document = await session.getDocument(uri, { referencedFrom: person.uri });
  const schema = await session.get(uri, { referencedFrom: person.uri });
}
```

`referencedFrom` matters for a schema embedded in the same document, like
an `$id` in `$defs`. It's only found from the document it's in, so without
`referencedFrom` it isn't found, or a different schema with the same URI
is. When the schema making the reference is in more than one document,
like a schema that's also in a bundle, an embedded schema is only found
if every one of those documents embeds it. Every other reference is found the usual way: in the registries, then by
retrieving it.

`visitReferences` finds every reference in a document, with the URI it
refers to: `$ref` in every dialect, 2020-12's `$dynamicRef`, and 2019-09's
`$recursiveRef`. In the tree, a reference that's a keyword's value is a
`json` node with the resolved URI as `href`, and a draft-04 to draft-07
`$ref` is a `reference` node with `href`.

Follow references in the session the document is in, so you only reach
what its registry and `allowRetrieval` allow. In a lint rule, that's
`file.data.jsonSchemaSession`, and [`findSchema`](lint-rules.md#looking-at-other-schemas)
does this for you.
