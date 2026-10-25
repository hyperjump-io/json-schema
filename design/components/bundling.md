# Bundling (`src/bundle/`)

`bundle(uri, options)` on `JsonSchema` and `JsonSchemaSession` makes a compound schema document the way
2020-12 describes, in any dialect: every referenced document is embedded in
the main schema's definitions with its identifier, so no reference changes.
It's v1's bundler and keeps its options (`alwaysIncludeDialect`,
`definitionNamingStrategy`, `externalSchemas`). A new kind of bundle is
being considered (see [Open questions](../specs/keyword/README.md#open-questions)).

- Like `compile`, `JsonSchema.bundle` creates a session for it, and its
  options include `SessionOptions`, so the session's registries and
  `allowRetrieval` decide what can be bundled. It's implemented in
  `src/bundle/bundle.js`, which isn't exported.
- References are found the way `visitReferences` finds them (`$ref` and
  draft-04–07 reference nodes), plus 2020-12's `$dynamicRef`, in the whole
  tree, so a reference in a definition nothing uses is bundled.
  `$recursiveRef` and v1's `$dynamicRef` never leave the document. A custom
  keyword that references a schema isn't followed. Compiling and bundling
  what the session loaded was considered, because it would follow any
  keyword, but it misses definitions nothing uses, which a library of
  definitions is.
- A reference to a resource that's already in the bundle, including one
  embedded in an embedded document, isn't followed. Each document is
  embedded once.
- A document is found with `getDocument` and no `referencedFrom`, so it's
  always a whole document from a registry or retrieval. If its URI isn't
  the one the reference used, the reference wouldn't find it in the bundle,
  so that's an error rather than a broken bundle.
- The schema AST stringifies back to the original document, so a document
  is embedded with `jsonValue` and nothing has to be put back, unlike v1,
  which restored anchors. The root gets `$schema` and an identifier, first.
  An identifier that's already there is replaced, because a relative one
  would be resolved against the bundle. A plain-name fragment in a draft-04
  `id` is kept, because it's an anchor.
- `$schema` is always on the main schema, and on an embedded schema whose
  dialect is different (or always, with `alwaysIncludeDialect`). The
  resolver reads `$schema` before anything else, so an embedded schema in
  another dialect is identified by its own dialect's `$id`. One that already
  has `$schema` keeps it. draft-04–07 dialects are written with an empty
  fragment, as their meta-schemas are.
- A main schema from a file isn't given an identifier, and embedded files
  are identified relative to it, so the bundle can be moved with its files.
  Anything else is identified by its absolute URI.
- `false` is embedded as `{ "not": {} }`, because only an object can have
  an identifier. `true` is `{}`.
- In draft-04–07, a `$ref` at the root replaces the whole object. An
  embedded document with one would lose its identifier, and a main schema
  with one would lose its definitions, so both are errors. A main schema
  that's only a `$ref` with nothing to embed is returned as it is, because
  its dialect isn't recorded.
- Meta-schemas aren't bundled. `$schema` isn't a reference, and
  `getDialect` doesn't look in embedded resources.
- Tests run v1's bundle test cases in every dialect, with both naming
  strategies: the bundle is compiled on its own and must give the same
  DETAILED errors and annotations as the schemas it was made from.

## Open questions

- **Portable bundles.** A bundle that's a folder of schemas (a tar?) rather
  than one compound document, so schemas can be moved between machines and
  implementations (a JS frontend and a C# backend) and restored in one step,
  straight into a registry. Paths would be the retrieval URIs. Unclear: how
  paths map to URIs, whether `$id`-less schemas need a base, and what other
  implementations would need to adopt it. v1-style bundling comes first.
