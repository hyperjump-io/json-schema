# Referenced schemas

What a reference refers to is found by browser's `get`, from the
reference's target, which has the document it's in. Compiling follows
what it finds, and linting doesn't.

- A reference is a `reference` node (see
  [Schema AST](../specs/schema-ast.md)), so browser follows it: a
  keyword's value, like `$ref` since 2019-09, as well as a schema that's
  a reference.
- Compiling reads a schema through targets, a step at a time (see
  [Compile and evaluate](kernel/README.md)), so a reference it reaches is
  a target. It's followed with `get` and that target as `referencedFrom`,
  which finds what the document embeds before anything is retrieved, and
  follows a schema that's a reference itself through any document to a
  value, with browser's `ERR_REFERENCE_CYCLE`. What's found is a target,
  with its document, which is where its own references are followed
  from.
- A schema's resource is the one in its document's `embedded` with the
  URI of its location. Every resource of a schema document shares one
  `embedded` (see [Schema AST](../specs/schema-ast.md)), so a target's
  document has all of them, and a message can name the document a
  resource came from.
- Linting finds a reference with `findSchema` (`src/lint/find-schema.js`),
  which is `get` from the reference's target with `reference: "manual"`,
  so what it finds isn't followed. Lint reports on references as they're
  written. A document's references are found as targets by browsing it as
  it's written (`jrefVisit` with `reference: "manual"`).
  - A tree that's linted can be one the session didn't retrieve, like an
    editor's. Its root's target is made from the tree and the schema
    media type (browser's `documentTarget`), and it's browsed from there,
    so browser finds what it embeds the way it does for a document it
    retrieved.
  - What's found has the document it's in, which is the whole document,
    not a resource it embeds.
- What isn't a schema is an error whose `cause.code` is
  `ERR_NOT_A_SCHEMA`: a document that isn't a schema document, like JSON
  or JRef, or a value in a schema that isn't a schema. For linting,
  that's what the reference finds. For compiling, it's only where the
  references end, so a reference can go through a document that isn't a
  schema, like a JRef reference, to reach one. Only what's compiled has
  to be a schema.
- Bundling gathers whole documents (see [Bundling](bundling.md)).

Rejected:

- A `referencedSchema(session, uri, embedded)` of this package's for
  linting, which looked in the `embedded` of the document a reference is
  in before using the session, and found the fragment with the schema
  media type itself. It was how browser follows a reference, written
  again, because browser couldn't follow one from a document it didn't
  retrieve. Linting gave it the linted tree's `embedded` for every
  reference, so a reference in another document found what the linted
  tree embeds.
- A target made from a node, for a subschema or a reference that was
  found by walking nodes. Reading a schema through targets gives each one
  as a target.
- A `followedSchema(session, uri, from)` of this package's for compiling:
  `get` from a node, and then a second lookup from the node it found for
  the resource it's in. It was two lookups for what `get` had when it
  found the node, and compiling kept its own record of which document
  each schema came from. A target has both.
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
- Bundling by following references. A bundle is one document, so a
  reference is looked for in every document that's been gathered, not
  only the one it's in, and only whole documents are embedded (see
  [Bundling](bundling.md)).
