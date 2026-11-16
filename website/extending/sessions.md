# Sessions

A session retrieves and browses schemas. Everything it finds belongs to
it, including the documents it retrieves and the dialects it builds from
meta-schemas. All of it goes away with the session.

Each operation, like `validator` or `bundle`, starts a session of its own.
A session is [`@hyperjump/browser`](https://github.com/hyperjump-io/browser/blob/v2/website/sessions.md)'s,
a `Hyperjump`, made from your configuration. Start one yourself with
`new Hyperjump(config)` to:

- **Browse schemas** with the
  [`@hyperjump/browser`](https://github.com/hyperjump-io/browser/blob/v2/website/README.md)
  functions and [follow references](#following-references) in a tool of
  your own. See [Browsing](#browsing).

```typescript
import { Hyperjump } from "@hyperjump/browser";
import { get } from "@hyperjump/json-schema";

const session = new Hyperjump({ ...config, registry });

const name = await get(
  session,
  "https://example.com/person#/properties/name"
);
```

A session takes only a configuration. For a session with its own
`registry` or `allowRetrieval`, give it a configuration that has them, like
the example. That replaces the configuration's registry. If the
configuration has one, keep it too with
`registry: config.registry.concat(mine)`.

A session keeps documents as they were when it first retrieved them.
Start a new session to get changes. Sessions only share an HTTP cache when
their configuration has a `stack` with one. See
[Retrieving less](../guides/retrieval.md#retrieving-less).

## Browsing

A session is a browser session, a `Hyperjump`, that the functions of
[`@hyperjump/browser`](https://github.com/hyperjump-io/browser/blob/v2/website/README.md)
take, so you browse schemas with them. This package exports `get` too:

| Function | What it does |
| --- | --- |
| `get(session, uri)` | A target for what a URI identifies: its `node`, and the `document` the node is in. A fragment is an anchor or a JSON Pointer. It follows a draft-04 to draft-07 `$ref`. |
| `get(session, uri, { reference: "manual" })` | The same, without following a `$ref`, so the target's `document` is always the document at the URI |
| `jrefSelect(session, selector, target)` and the other `jref` functions | Find the values under a target, following references. See [browser's browsing](https://github.com/hyperjump-io/browser/blob/v2/website/browsing.md). |
| `getDialect(session, uri)` | A dialect, from the configuration or from a meta-schema the session finds |

A session looks for a schema in the configuration's registry first, and
retrieves it otherwise. `allowRetrieval` doesn't apply to a schema in a
registry.

A session is a `Hyperjump`, browser's session, so you trace its requests,
watch them, and close it the way browser does:

```typescript
import { Trace } from "@hyperjump/browser";

const trace = new Trace(session);
```

### What you get isn't always a schema

A reference can lead to any document the session can read, like a JSON
file, or a JRef document if the configuration has `jrefMediaType`. So the
node of a target from `get` or a `jref` function might not be a schema, and
its document might not be a schema document. Check with `isSchemaNode` and
`isSchemaDocument`:

```typescript
import { get, isSchemaNode } from "@hyperjump/json-schema";

const { node } = await get(session, "https://example.com/person");
if (isSchemaNode(node)) {
  node.dialectUri; // "https://json-schema.org/v1"
}
```

In TypeScript, the type of what you get comes from the session. A session
from a configuration you created gives a target whose node is of one of its
media types: a schema's node, a JSON node, or another, like a JRef node if
the configuration has `jrefMediaType`. A schema's node has the `type`
`"json-schema"`. A session that's only typed as
`Hyperjump<JsonSchemaConfig>`, like a function's parameter, could have any
media types, so a target's `document` and `node` are `unknown` until you
check them.

## Following references

Some tools follow references themselves, like a documentation generator or
a bundler. They find what a reference points to with `get`. Pass the
reference's target as `referencedFrom`, so the session knows which document
to follow it from. Browsing a schema as it's written, with
`reference: "manual"`, gives you its references as targets:

```typescript
import { Hyperjump, jrefFindAll } from "@hyperjump/browser";
import { get, isSchemaNode } from "@hyperjump/json-schema";

const session = new Hyperjump(config);
const person = await get(
  session,
  "https://example.com/person",
  { reference: "manual" }
);

const references = await jrefFindAll(
  session,
  person,
  "reference",
  { reference: "manual" }
);

for (const reference of references) {
  const schema = await get(
    session,
    reference.node.href,
    { referencedFrom: reference }
  );
  if (isSchemaNode(schema.node)) {
    // The schema the reference finds, and the document it's in
  }
}
```

A reference is a node whose `type` is `"reference"`, with the URI it
resolves to as `href`: a `$ref` from draft-04 through draft-07, which is
the whole schema, or the value of `$ref` since 2019-09.

`referencedFrom` matters for a schema embedded in the same document, like
an `$id` in `$defs`. The session only finds an embedded schema from the
document it's in. Without `referencedFrom`, the session doesn't find it, or
finds a different schema with the same URI instead. The session finds
every other reference the usual way: first in the registries, then by
retrieving it. What `get` gives you is a target too, so you follow a
reference in the schema it found by passing it as `referencedFrom` in turn.

`visitReferences` finds every reference in a document along with the URI it
refers to and its node. It finds `$ref` in every dialect, 2020-12's
`$dynamicRef`, and 2019-09's `$recursiveRef`. In the tree, a reference
that's a keyword's value is a `json` node with the resolved URI as `href`.
A draft-04 to draft-07 `$ref` is a `reference` node with `href`.

Follow references in the session the document is in. That way you only
reach what its registry and `allowRetrieval` allow. In a lint rule,
[`documentForLint`](lint-rules.md#the-document-and-what-it-reaches) has
already followed them for you.
