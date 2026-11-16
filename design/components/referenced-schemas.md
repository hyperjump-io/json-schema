# Referenced schemas (`src/schema/referenced-schema.js`)

`referencedSchema(session, uri, embedded)` finds the schema a reference
refers to, and the resource it's in, without following it. It's what
linting finds references with. `followedSchema(session, uri, from)` finds
it followed, and it's what compiling finds references with. Neither is
part of the API.

- `referencedSchema` looks for a resource in `embedded`, which is the
  `embedded` of the document the reference is in, before anything is retrieved. Every
  resource of a schema document shares one `embedded` (see
  [Schema AST](../specs/schema-ast.md)), so the caller has it from any
  resource of the document, and what's found there has the same one.
  Anything else is a document `getDocument` finds, in a registry or by
  retrieving it.
- Both return the document with the node. Code that gathers the schemas a
  document reaches keeps state for each document, like where its
  references are followed from, so it needs both.
- A reference `referencedSchema` finds isn't followed. Lint reports on references as
  they're written. Lowering follows a schema that's a reference itself
  (see [Compile and evaluate](kernel/README.md)).
- What isn't a schema is an error whose `cause.code` is
  `ERR_NOT_A_SCHEMA`: a document that isn't a schema document, like JSON
  or JRef, or a value in a schema that isn't a schema. For
  `referencedSchema`, that's what the reference finds. For
  `followedSchema`, it's only where the references end, so a reference
  can go through a document that isn't a schema, like a JRef reference,
  to reach one. Only what's compiled has to be a schema.
- `followedSchema` is browser's `get` with the schema the reference is in
  as `referencedFrom`, which finds what that schema's document embeds and
  follows references, with browser's `ERR_REFERENCE_CYCLE`. The resource
  is browser's `getDocument` with the node it found as `referencedFrom`,
  which finds the embedded resource the node is in. Compiling only
  follows references from documents the session has.
- Linting doesn't use `referencedFrom`, because a tree that's linted can
  be one the session doesn't have, like an editor's. It's looked in with
  its `embedded`. Bundling gathers whole documents (see
  [Bundling](bundling.md)).

Rejected:

- `get` with the reference's node as `referencedFrom`, and then a lookup
  of the document the node it returns is in, kept by this package. The
  session kept every resource by URI for that lookup (`addResources`,
  `resourceOf`), which walked a location's pointer in each resource with
  the URI. Browser's `getDocument` with `referencedFrom` is that lookup,
  so `followedSchema` uses it instead.
- Browser without `getDocument`: `get` with `follow: false`, and a
  `documentOf(session, node)` for the document a node is in. It was built
  and reverted on 2026-11-13. Every caller that wanted a document got its
  root to look the document up from, the lookup could fail, and tests
  rebuilt `getDocument` from the two calls.
- `get` returning the node with its document. Every caller would
  destructure, and the browsing functions would take both.
- A node that refers to its document. It's the simplest, but the trees
  are unist ASTs, which are JSON-serializable, and a tree whose nodes
  refer to their document is cyclic.
- Bundling with it. A bundle is one document, so a reference is looked for
  in every document that's been gathered, not only the one it's in, and
  only whole documents are embedded (see [Bundling](bundling.md)).
