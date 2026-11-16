# Referenced schemas (`src/schema/referenced-schema.js`)

What a reference refers to is found two ways. Compiling follows a
reference with browser's `get`, from the target of the schema it's in.
Linting finds one with `referencedSchema(session, uri, embedded)`, which
doesn't follow what it finds and isn't part of the API.

- Compiling has every schema as a target: its node and the document it's
  in, which is the one that was retrieved. A reference in a schema is
  `get` with that target as `referencedFrom`, which finds what the
  document embeds before anything is retrieved, follows a schema that's a
  reference itself through any document to a value, with browser's
  `ERR_REFERENCE_CYCLE`, and returns a target. So what a reference finds
  comes with its document, which is where its own references are
  followed from, and a schema inside it is the same document with that
  schema's node.
- A schema's resource is the one in its document's `embedded` with the
  URI of its location. Every resource of a schema document shares one
  `embedded` (see [Schema AST](../specs/schema-ast.md)), so a target's
  document has all of them, and a message can name the document a
  resource came from.
- `referencedSchema` looks for a resource in `embedded`, which is the
  `embedded` of the document the reference is in, before anything is
  retrieved. Anything else is a document `get` finds, in a registry or
  by retrieving it, with `reference: "manual"`, so it's the document at
  the URI. It returns the document with the node.
- A reference `referencedSchema` finds isn't followed. Lint reports on
  references as they're written.
- What isn't a schema is an error whose `cause.code` is
  `ERR_NOT_A_SCHEMA`: a document that isn't a schema document, like JSON
  or JRef, or a value in a schema that isn't a schema. For
  `referencedSchema`, that's what the reference finds. For compiling,
  it's only where the references end, so a reference can go through a
  document that isn't a schema, like a JRef reference, to reach one. Only
  what's compiled has to be a schema.
- Linting doesn't follow from a target, because a tree that's linted can
  be one the session didn't retrieve, like an editor's, and browser
  follows a reference from one of those without its document. It's looked
  in with its `embedded`. Bundling gathers whole documents (see
  [Bundling](bundling.md)).

Rejected:

- A `followedSchema(session, uri, from)` of this package's for compiling:
  `get` from a node, and then a second lookup from the node it found for
  the resource it's in. It was two lookups for what `get` had when it found
  the node, and compiling kept its own record of which document each
  schema came from. A target has both.
- A lookup of the document a node is in, kept by this package. The
  session kept every resource by URI for it (`addResources`,
  `resourceOf`), which walked a location's pointer in each resource with
  the URI.
- `get` returning a node, without following, and a
  `documentOf(session, node)` for the document a node is in. Every caller
  that wanted a document got its root to look the document up from, and
  the lookup could fail. A target has its document.
- A node that refers to its document. It's the simplest, but the trees
  are unist ASTs, which are JSON-serializable, and a tree whose nodes
  refer to their document is cyclic.
- Bundling with `referencedSchema`. A bundle is one document, so a
  reference is looked for in every document that's been gathered, not
  only the one it's in, and only whole documents are embedded (see
  [Bundling](bundling.md)).
