# Bundling (`src/bundle/`)

`bundle(config, uri, options)` makes a compound schema document the way
2020-12 describes, in any dialect: every referenced document is embedded in
the main schema's definitions with its identifier, so no reference changes.
It's v1's bundler and keeps its options (`alwaysIncludeDialect`,
`definitionNamingStrategy`, `externalSchemas`). A new kind of bundle is
being considered (see [Open questions](#open-questions)).

- Like `compile`, `bundle` (`src/operations/bundle.js`) creates a session for it, and its
  options include `SessionOptions`, so the session's registry and
  `allowRetrieval` decide what can be bundled. It's implemented in
  `src/bundle/bundle.js`, which isn't exported.
- Everything is retrieved first: the main document, the documents it
  references, and their dialects. The bundle is then made from them
  without retrieving anything (`bundleDocuments`). Rejected: retrieving
  the dialects as each document is embedded.
- A document's references are found by browsing it as it's written, with
  browser's `jrefFindAll` and `reference: "manual"`, which gives each
  `reference` node as a target (`$ref`, draft-04–07 reference nodes, and
  2020-12's `$dynamicRef`), in the whole tree, so a reference in a
  definition nothing uses is bundled. A reference is followed from its
  target, so the document it's in is what caused the request.
  `$recursiveRef` and v1's `$dynamicRef` never leave the document. A custom
  keyword that references a schema isn't followed. Compiling and bundling
  what the session loaded was considered, because it would follow any
  keyword, but it misses definitions nothing uses, which a library of
  definitions is.
- What each document's references find is loaded ahead, as compiling
  does (see [The kernel](kernel/README.md)), so documents are retrieved at
  the same time. An external schema isn't loaded. A reference to a
  resource that's embedded in another document of the bundle is loaded,
  though bundling doesn't follow it.
- A reference to a resource that's already in the bundle, including one
  embedded in an embedded document, isn't followed. Each document is
  embedded once. That's looked for in every document that's been
  gathered, not only the one the reference is in, which is why bundling
  keeps the loop that gathers documents and doesn't browse with
  references followed.
- A bundle is one document, so it can only have one resource for a URI.
  Two of its documents that have a resource with the same URI have to
  have an identical one, or it's a `duplicate-id` problem.
- A document is found with `browse` and `reference: "manual"`, so it's
  always a whole document from a registry or retrieval, even one whose
  root is a `$ref`. If its URI isn't
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
- The main schema's dialect decides where `$schema` can go, because the
  bundle is read in it. Draft-04–07 only allow it at the document's root
  (`misplaced-dialect`), so a main schema in those drafts can't embed a
  schema in another dialect, which is an error: another implementation
  would read it in the main schema's dialect. One in the same dialect
  never gets `$schema`, even with `alwaysIncludeDialect`, and one it
  already has is removed, which changes nothing. Rejected: writing
  `$schema` anyway, which this resolver reads, but the bundle would fail
  `misplaced-dialect` and validate differently elsewhere. 2019-09 allows
  `$schema` next to an embedded schema's `$id`, and says a document's
  resources should have the same dialect, so a 2019-09 bundle can embed
  one in another dialect, and `embedded-dialect-change` warns about it.
  2020-12 and later allow any dialect there. The dialects that restrict
  `$schema` are the bundler's own list of dialect URIs, as they are
  `misplaced-dialect`'s. A custom dialect is allowed anything. Rejected:
  finding draft-04–07 by draft-07's `$id` keyword, which `misplaced-dialect`
  didn't, and a table they share, which is two lists of three URIs.
- A schema can't be identified by a `file:` URI, so a bundle of files is
  identified by the `id` option: the main schema gets it, and each embedded
  file is identified where it is relative to the main schema, resolved
  against `id`. References aren't changed, and they resolve against the
  new base the way they did against the folder, so they find the same
  schemas. Embedded files stay resources of their own, so `$dynamicRef`,
  `#` references, and annotations are the same. A file with an absolute
  `$id`, and anything that isn't a file, keeps its URI. Embedding a file
  without an identifier and without `id` is an error that names the
  option, and a file that embeds nothing doesn't need it. `id` has to be
  absolute, not a file, and without a fragment. It's named for what it
  sets, the main schema's identifier, not "base URI", which is what
  references are resolved against. Rejected: a file's bundle without an
  identifier, with embedded files identified relative to it, which the
  rule about `file:` identifiers makes invalid. Rejected: rewriting
  references into the bundle (`#/$defs/address/...`), which makes an
  embedded file not a resource and changes how its own references and
  dynamic anchors resolve, and making up an identifier (`tag:`), which two
  bundles would both claim.
- The main schema is the one file that isn't identified where it is
  relative to itself, resolved against `id`, because it's `id`. A
  reference to it by its path finds its name resolved against `id`, so
  if something references it that way, `id` has to end with its name, or
  it's an error that says so. A draft-04 to draft-07 `$ref` in the main
  schema is taken as a fragment, because it isn't kept as it's written.
  And two files can't be identified the same, which happens when `id`
  has fewer path segments than the files go up from the main schema,
  because `..` stops at the root.
- Its errors say document URIs relative to the working directory (see
  [Local paths in messages and output](file-uris.md)).
- `false` is embedded as `{ "not": {} }`, because only an object can have
  an identifier. `true` is `{}`.
- In draft-04–07, a `$ref` at the root replaces the whole object. An
  embedded document with one would lose its identifier, so it's an error.
  A main schema with one is an error too: it can't have an identifier,
  and though the resolver finds the schemas in `definitions` next to
  `$ref` (see [Schema validation](schema-validation.md)), other
  implementations might not, and `ignored-ref-siblings` reports it. A bundle
  is meant to be used anywhere. A main schema
  that's only a `$ref` with nothing to embed is returned as it is, because
  its dialect isn't recorded.
- A reference can't be written as a `file:` URI (see
  [Schema validation](schema-validation.md)), so every reference between
  files is relative and finds the embedded schema in a bundle with `id`.
- Meta-schemas aren't bundled. `$schema` isn't a reference, and
  `getDialect` doesn't look in embedded resources. A meta-schema that a
  `$ref` refers to, like `{ "$ref": "https://json-schema.org/draft/2020-12/schema" }`,
  can't be embedded either, if it defines a dialect (`definedDialect`),
  which is an error. Only a document's root defines one (see
  [Dialects from meta-schemas](dialects/from-meta-schemas.md)), so it
  wouldn't work as a meta-schema in the bundle, as people would expect it
  to. Rejected: removing its `$vocabulary`, which `misplaced-vocabulary`
  reports, for the same reason. Make it an external schema instead.
- Tests run v1's bundle test cases in every dialect, with both naming
  strategies: the bundle is compiled on its own and must give the same
  DETAILED errors and annotations as the schemas it was made from.

## Open questions

- **Portable bundles.** A bundle that's a folder of schemas (a tar?) rather
  than one compound document, so schemas can be moved between machines and
  implementations (a JS frontend and a C# backend) and restored in one step,
  straight into a registry. Paths would be the retrieval URIs. Unclear: how
  paths map to URIs, whether `$id`-less schemas need a base, and what other
  implementations would need to adopt it. It's only worth it if they read
  the same format, so it would be agreed with them, not decided here.
