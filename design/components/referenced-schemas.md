# Referenced schemas (`src/schema/referenced-schema.js`)

`referencedSchema(session, uri, embedded)` finds the schema a reference
refers to, and the resource it's in. It's what compiling and linting find
references with. It isn't part of the API.

- A resource is looked for in `embedded`, which is the `embedded` of the
  document the reference is in, before anything is retrieved. Every
  resource of a schema document shares one `embedded` (see
  [Schema AST](../specs/schema-ast.md)), so the caller has it from any
  resource of the document, and what's found there has the same one.
  Anything else is a document `getDocument` finds, in a registry or by
  retrieving it.
- It returns the document with the node. Code that gathers the schemas a
  document reaches keeps state for each document, like where its
  references are followed from, so it needs both.
- A reference it finds isn't followed. Lint reports on references as
  they're written. Lowering follows a schema that's a reference itself
  (see [Compile and evaluate](kernel/README.md)).
- What isn't a schema is an error whose `cause.code` is
  `ERR_NOT_A_SCHEMA`: a document that isn't a schema document, like JSON
  or JRef, or a value in a schema that isn't a schema. A reference can't
  go through a document that isn't a schema to reach one.
- This package's own code doesn't use browser's `get` or `referencedFrom`.
  Browser's functions are for browsing, where each step is awaited and
  references are followed. Compiling, linting, and bundling gather the
  documents a schema reaches and then read them synchronously, as
  references are written, with the document of everything they find.

Rejected:

- `get` with the reference's node as `referencedFrom`, and then a lookup
  of the document the node it returns is in. The session kept every
  resource by URI for that lookup (`addResources`, `resourceOf`), which
  walked a location's pointer in each resource with the URI. The caller
  had the reference's document, and the lookup found what `get` had just
  had.
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
