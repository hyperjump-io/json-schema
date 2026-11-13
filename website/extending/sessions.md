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
  functions and [follow references](#following-references) in a tool of
  your own. See [Browsing](#browsing).
- **Read annotations** by keyword name with `annotation`. See
  [Annotations](../guides/annotations.md#reading-an-annotation).

```typescript
import { get, validator } from "@hyperjump/json-schema";

const session = jsonSchema.session({ registry });

const isPerson = await validator(session, "https://example.com/person");
const isAddress = await validator(session, "https://example.com/address");

const name = await get(
  session,
  "https://example.com/person#/properties/name"
);
```

Every operation accepts a session in place of the `JsonSchema`. Operations
that use the same session share what it retrieved. A session takes the same
`registry` and `allowRetrieval` options as an operation. An operation given
a session can't take them. A validator doesn't need its session after it's
compiled.

A session sees documents as they were when it first retrieved them. Start
a new session to see changes. In Node.js, HTTP responses are cached across
sessions according to their caching headers, unless the config has a
`stack` of its own.

## Browsing

A session is a value that the functions of
[`@hyperjump/browser`](https://github.com/hyperjump-io/browser/blob/v2/website/README.md)
take, so you browse schemas with them. `get` and `documentOf` are exported
from this package too:

| Function | What it does |
| --- | --- |
| `get(session, uri)` | The node a URI identifies. A fragment is an anchor or a JSON Pointer. It follows a draft-04 to draft-07 `$ref`, unless you pass `follow: false`. |
| `documentOf(session, node)` | The document a node is in |
| `jrefStep(session, key, node)` and the other `jref` functions | Step into a node, following references. See [browser's browsing](https://github.com/hyperjump-io/browser/blob/v2/website/browsing.md). |
| `getDialect(session, uri)` | A dialect, from the config or from a meta-schema the session finds |
| `annotation(session, node, keyword)` | A node's annotations. See [Annotations](../guides/annotations.md#reading-an-annotation). |

A schema is found in the session's registry first, then in the
`JsonSchema`'s, and then it's retrieved. `allowRetrieval` doesn't apply to a
schema in a registry.

To get the document at a URI, get its root and then the document the root is
in. Pass `follow: false`, so that a schema that's a `$ref` doesn't lead to
another document:

```typescript
import { documentOf, get } from "@hyperjump/json-schema";

const root = await get(session, "https://example.com/person", {
  follow: false
});
const person = await documentOf(session, root);
```

Tracing a session's requests, watching them, and closing it belong to
browser's session, which is the session's `hyperjump`:

```typescript
import { Trace } from "@hyperjump/browser";

const trace = new Trace(session.hyperjump);
```

### What you get isn't always a schema

A reference can lead to any document the session can read, like a JSON
file or a JRef document. So a node from `get` or a `jref` function might
not be a schema, and a document from `documentOf` might not be a schema
document. Check with `isSchemaNode` and `isSchemaDocument`:

```typescript
import { get, isSchemaNode } from "@hyperjump/json-schema";

const node = await get(session, "https://example.com/person");
if (isSchemaNode(node)) {
  node.dialectUri; // "https://json-schema.org/v1"
}
```

In TypeScript, the type of what you get comes from the session. A session
from a `JsonSchema` you created gives a schema's node, a JRef node, or a
JSON node, and a schema's node has the `type` `"json-schema"`. A session
that's only typed as `JsonSchemaSession`, like a function's parameter,
could have any media types, so what it gives is `unknown` until you check
it.

## Following references

Some tools follow references themselves, like a documentation generator or
a bundler. They find what a reference points to with `get`. Pass the
reference's node as `referencedFrom`, so the session knows which document
the reference is in.

```typescript
import {
  documentOf, get, isSchemaDocument, isSchemaNode,
  type JsonSchemaNode
} from "@hyperjump/json-schema";
import { visitReferences } from "@hyperjump/json-schema/lint";

const session = jsonSchema.session();
const root = await get(session, "https://example.com/person", {
  follow: false
});
const person = await documentOf(session, root);
if (!isSchemaDocument(person)) {
  throw Error("Not a schema");
}

const references: [string, JsonSchemaNode][] = [];
visitReferences(person, (uri, node) => references.push([uri, node]));

for (const [uri, node] of references) {
  const schema = await get(session, uri, { referencedFrom: node });
  if (isSchemaNode(schema)) {
    // The schema the reference finds
  }
}
```

`referencedFrom` matters for a schema embedded in the same document, like
an `$id` in `$defs`. An embedded schema is only found from the document
it's in. Without `referencedFrom`, it isn't found, or a different schema
with the same URI is found instead. Every other reference is found the
usual way: first in the registries, then by retrieving it.

`visitReferences` finds every reference in a document along with the URI it
refers to and its node. It finds `$ref` in every dialect, 2020-12's
`$dynamicRef`, and 2019-09's `$recursiveRef`. In the tree, a reference
that's a keyword's value is a `json` node with the resolved URI as `href`.
A draft-04 to draft-07 `$ref` is a `reference` node with `href`.

Follow references in the session the document is in. That way you only
reach what its registry and `allowRetrieval` allow. In a lint rule,
[`documentForLint`](lint-rules.md#the-document-and-what-it-reaches) has
already followed them for you.
