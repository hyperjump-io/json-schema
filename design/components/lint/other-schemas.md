# Other schemas

Some rules need other schemas, like one that checks a reference to another
document finds something. They can see what's in registries and what
`allowRetrieval` allows, and nothing else.

- The resolve step puts the file's session on `file.data.jsonSchemaSession`.
  Rules never create sessions, so they get the application's
  `allowRetrieval` instead of each rule having to remember a restriction.
- Rules don't use the session either. `documentForLint(tree, file)`
  (`src/lint/document.js`) is the one place lint retrieves anything. It
  follows every static reference in the file and in the documents they
  reach, transitively, and gives a `LintDocument`: what this document's
  schemas lower to (`schemas`), what the reached documents' do too
  (`reached`), what each reference found (`found`), every schema by
  location, each dialect, and the definitions the documents use. It's
  found once for each tree and session, and a reached document is lowered
  once for each session. Every helper (`schemaGroup`, `effectOf`,
  `marksEvery`, `evaluatorForLint`, `formatTypes`, `keywordAppliesTo`, …)
  is a synchronous function of it, except `lowerSchemaForLint`, which
  lowers a schema a rule made. Before 2026-10-30, rules took
  `(session, tree)`, each helper followed references itself, as it needed
  them, with caches keyed by session in five modules, and `effectOf` found
  references again for every keyword. Following all of them up front
  retrieves nothing more than `evaluatorForLint` already did, which
  `recommended` uses, and the schemastore corpus lints with the same
  messages about 5× faster. Rejected: an object that hides the session and
  memoizes each helper, which keeps rules depending on something that
  retrieves.
- What each document's references find is loaded ahead, as compiling
  does (see [The kernel](../kernel/README.md)), so documents are retrieved
  at the same time. Lint follows every static reference anyway, so it
  retrieves nothing it doesn't use.
- The identifier of what each of the file's references finds is found
  too, for `reference-by-location`, so no rule needs to find anything
  itself.
- `findSchema(session, uri, options)` (`src/lint/find-schema.js`) finds what
  a reference would, without following a reference it finds. It's
  browser's `browse` from the document the reference is in, with
  `reference: "manual"` (see
  [Referenced schemas](../referenced-schemas.md)), with a failure as a
  result. It's what
  `documentForLint` finds references with, and isn't part of the API, so a
  rule can't retrieve anything. A rule that needs a URI no reference names
  gets it by `documentForLint` finding it too, like the identifiers above. Its result is
  `found` with the node, or `missing` or `unknown` with the reason as an
  error, so a rule can say why.
- Only a definite absence is `missing`: a file that doesn't exist, an HTTP
  404 or 410, a document that isn't a schema, a fragment that doesn't point
  to anything, an anchor that doesn't exist, or something that isn't a
  schema. Anything else that keeps it from telling is `unknown`: a refused
  URL, an unsupported URI scheme (like `urn:`), any other retrieval
  failure, or a document with problems. A rule reports `missing` and not
  `unknown`. Otherwise every reference to a published schema would be
  reported, and so would every one to a schema that's already reported as
  having problems.
- A document that's linted isn't retrieved. The engine reads the file and
  the processor resolves it, so the session doesn't have it. A reference
  is followed from its own target, `findSchema`'s `from` option. A
  document is browsed as it's written from the document, which browser
  takes where it takes a target, so browser finds what one the session
  didn't retrieve contains the way it does for one it retrieved. Rules get the nodes being
  linted, even when the document has problems, and nothing is read again,
  so stdin and editor buffers work.
- Adding the linted document to the session was considered: to browser's
  cache, with a new method or a session option, or to a session registry.
  It would mean changing browser's cache from outside, a second session per
  file (resolving needs the session first), or resolving the file twice and
  getting another tree, which can't be resolved at all if it has problems.
- A reference back to the linted file from another document goes through
  the session, which retrieves the file. That's the same text for the CLI.
  The language server's `file:` plugin reads open files from their buffers.
- `documentForLint` follows references with browser: resolve the
  reference against its resource's URI and find that, from the document
  the reference is in. What a URI finds is kept once, and the linted
  document's references are found first, so it's what a reference in
  that document finds. A document is read in one walk, with browser's
  `jrefVisit` and `reference: "manual"`, which finds its schemas and its
  references as targets, every static reference in every dialect: a `$ref`
  keyword (2019-09 and later), resolved against its schema's location, or
  a schema that's a reference (`$ref` in draft-04 through draft-07, whose
  `href` is already resolved). Following one is `findSchema` on its URI.
  Dynamic references aren't visited, because what they find depends on
  evaluation.
- `reference-without-target` reports a static reference whose target is
  `missing`, with `findSchema`'s reason (from `found`). It covers references within the
  document as well as to other documents, because both are a schema that
  can't be compiled. It's an error in the recommended preset, where every
  other rule is a warning, because `compile` fails on the same reference.
  A target that isn't a schema is `missing` too, such as `#/definitions/foo`
  in 2020-12, where `definitions` isn't a keyword, which `compile` also
  can't find. A reference that's `unknown` isn't reported.
- `reference-by-location` reports a static reference that finds a schema
  by a URI with a different base than the canonical URI of what it finds
  (the found node's `location`): a file or URL for a schema with an `$id`,
  or a JSON Pointer into an embedded resource. It's one rule for both
  because they're the same mistake, a location where an identifier works
  everywhere, and the spec says a JSON Pointer SHOULD NOT cross into an
  embedded resource. A schema in a file that's found both ways is two
  documents (an entry's `origin` maps the registry's copy to its file),
  which is why the rule was wanted. It's reported only if the identifier
  finds the schema in the session too. Otherwise the reference couldn't
  use it, like the file's `$id` when the schema isn't in a registry. The
  message gives the identifier as an absolute URI, which can't be a `file:`
  URI, so it doesn't say where files are. Rejected: reporting only `file:`
  references, which leaves out retrieval URLs and embedded resources, and
  giving the identifier relative to the referencing schema, which is
  shorter but harder to read when the bases have nothing in common.
- Schemas aren't trusted, but plugins are. A plugin could make its own
  unrestricted config. Nothing can stop code that sets out to do that.
  The restriction keeps a schema from making rules retrieve what it names.
