# Dialects from meta-schemas

- A meta-schema can define a dialect. A resolve hook calls
  `defineDialect` with the dialect without its URI (`DialectDefinition`),
  and the resolver records it on the document
  (`JsonSchemaDocumentNode.definedDialect`). Only the document's root
  defines a dialect, because a meta-schema is found by its URI with
  `browse`, and a URI only finds a document. An embedded resource's URI
  only finds it from a reference in the same document. Anywhere else,
  it's ignored, and `misplaced-vocabulary` reports it. Rejected: an
  embedded resource defining a dialect, which nothing could find.

- A dialect that isn't defined is the one its meta-schema defines.
  `getDialect(session, uri)` gets the meta-schema with `browse`, so
  it can come from a registry, and it must be a schema. The dialect is
  identified by the URI it was asked for, which can be any URI the
  meta-schema is found by. It's cached in each session that uses it, because
  that's where the URI it was asked for is known. A dialect that's already
  defined isn't replaced.
- A self-describing meta-schema (its `$schema` is the URI it was retrieved
  from) can't define its own dialect, because the dialect is needed to find
  out what it defines. Its dialect has to be in the config, as the built-in
  2019-09 and 2020-12 are. Custom meta-schemas normally use `$schema` for one of
  those, so they still define their dialects. Meta-schemas that depend on
  each other are detected with `getDialect`'s `referencedFrom` option instead
  of waiting forever.

## Known limitations

- Meta-schemas that depend on each other hang instead of being an error
  if they're retrieved through a redirect. The cycle is detected with the
  resolver's `referencedFrom`, which is the meta-schema's document URI,
  but dialects being loaded are recorded by the URI they were requested
  by. After a redirect, those differ. Fixing it needs browser to give a
  media type plugin the URI that was requested along with the response.
- A self-describing meta-schema's dialect has to be added. One retrieved
  from a URI other than its `$schema` isn't recognized as self-describing,
  so its dialect is looked up like any other.
