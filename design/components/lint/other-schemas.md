# Other schemas

Some rules need other schemas, like one that checks a reference to another
document finds something. They can see what's in registries and what
`allowRetrieval` allows, and nothing else.

- The resolve step puts the file's session on `file.data.jsonSchemaSession`.
  Rules use it and never create sessions, so they get the application's
  `allowRetrieval` instead of each rule having to remember a restriction.
- `findSchema(session, uri, options)` (`src/lint/find-schema.js`) finds what
  a reference would, without following a reference it finds. Its result is
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
  from it is found with `findSchema`'s `document` option, which looks in
  the referencing document's `embedded` map before the session, the way
  `getDocument` does with `referencedFrom`. Rules get the nodes being
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
- Rules follow references the way browser does: resolve the reference
  against its resource's URI and find that. `visitReferences` does the
  first part for every static reference, in every dialect: a `$ref`
  keyword (2019-09 and later), resolved against its schema's location, or
  a schema that's a reference (`$ref` in draft-04 through draft-07, whose
  `href` is already resolved). Following one is `findSchema` on its URI.
  Dynamic references aren't visited, because what they find depends on
  evaluation.
- `reference-without-target` reports a static reference whose target is
  `missing`, with `findSchema`'s reason. It covers references within the
  document as well as to other documents, because both are a schema that
  can't be compiled. It's an error in the recommended preset, where every
  other rule is a warning, because `compile` fails on the same reference.
  A target that isn't a schema is `missing` too, such as `#/definitions/foo`
  in 2020-12, where `definitions` isn't a keyword, which `compile` also
  can't find. A reference that's `unknown` isn't reported.
- Schemas aren't trusted, but plugins are. A plugin could make its own
  unrestricted `JsonSchema`. Nothing can stop code that sets out to do that.
  The restriction keeps a schema from making rules retrieve what it names.
