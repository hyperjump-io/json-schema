# OpenAPI documents

Reading an OpenAPI document so that its Schema Objects are schemas, like
`openapi.json#/components/schemas/Pet`. Stage 1 is built (`src/openapi/`),
the rest isn't (see [Stages](#stages)).
The dialects are in [OpenAPI 3.0, 3.1, and 3.2](openapi.md).

## What OpenAPI says

- Every document in an OpenAPI Description (OAD) has an OpenAPI Object or
  a Schema Object at its root, and "MUST be fully parsed in order to
  locate possible reference targets" (3.2, Parsing Documents).
- A Schema Object's dialect is its `$schema`, then `jsonSchemaDialect`
  (3.1 and later), then the version's "OAS dialect schema id". "The value
  of `$schema` within a resource root Schema Object always overrides any
  default." `jsonSchemaDialect` is for Schema Objects "contained within
  this OAS document", not ones in other documents.
- The base URI is the OpenAPI Object's `$self` (3.2), resolved against the
  retrieval URI, or the retrieval URI. A Schema Object's `$id` changes it
  as in 2020-12.
- A fragment in JSON is a JSON Pointer.
- The media types are `application/openapi+json` and
  `application/openapi+yaml`. The entry document is RECOMMENDED to be
  `openapi.json` or `openapi.yaml`.
- Appendix G allows detecting an OpenAPI document by its root `openapi`
  field, and a document by "the expected type of the reference", which is
  implementation-defined. Parsing one document as two Object types is
  implementation-defined, and MAY be an error.

## Decisions

- One plugin for every version, `openApiMediaType`, for
  `application/openapi+json` and the file name `/openapi.json`. The
  version is the document's `openapi` field (`3.0.x`, `3.1.x`, `3.2.x`).
  Browser picks the most specific match, so the plugin's place in
  `mediaTypes` doesn't matter: an exact subtype beats `application/json`'s
  suffix match, and a file name beats `.json`.
- Any `.json` whose top-level `openapi` is a version the plugin reads is an
  OpenAPI document. The JSON-or-schema plugin checks for it, as it checks
  for `$schema`, and hands the text to the OpenAPI plugin when the
  session's config has one. Rejected: only the media type and the file
  name, which leaves `petstore.json` as JSON unless it's configured.
- JSON first. YAML is a media type plugin of its own, probably a sibling
  package that parses YAML to a JSON AST with positions, so schemas in
  YAML work too. Then `application/openapi+yaml` and `/openapi.yaml`.
- OpenAPI has its own resolver, which delegates to the JSON Schema
  resolver for Schema Objects. The OpenAPI resolver owns the document: it
  makes the root resource, with `$self` or the retrieval URI as its URI,
  walks the object model, marks what isn't a schema as data, and decides
  each Schema Object's dialect as above. The JSON Schema resolver only
  resolves a schema at a node. Rejected: a second entry point in the JSON
  Schema resolver for a document that isn't a schema at its root, which
  puts OpenAPI's object model and dialect rules in JSON Schema's resolver.
- What the JSON Schema resolver gives it is `resolveSchemaAt`
  (`src/schema/resolve.js`): resolving a node as a schema in a resource the
  caller made, at a pointer from the resource's root, in a dialect, with
  the resource's `embedded` shared, so a Schema Object's `$id` adds an
  embedded resource to the OpenAPI document. Its messages come back to the
  OpenAPI resolver. A dialect that can't be found is reported, and the
  Schema Object is data.
- A Schema Object isn't a resource's root unless it has `$id`, so its
  `$schema` is only allowed next to `$id`, which is what the JSON Schema
  resolver does for any schema that isn't a document's root. 3.1.1 and 3.2
  say `$schema` MAY be in "any Schema Object that is a schema resource
  root". 3.1.0 said "any root Schema Object", which 3.1.1 clarified.
- The document is a `JsonSchemaDocumentNode` whose root is data, so
  browser finds its fragments and embedded resources, and lint rules take
  it as they are. `openApiResolve` is `resolveOpenApi` as a unified plugin,
  like `jsonSchemaResolve`.
- The defaults without `jsonSchemaDialect`: 3.0's is
  `https://spec.openapis.org/oas/3.0/dialect`, and 3.1's is its "OAS
  dialect schema id", `https://spec.openapis.org/oas/3.1/dialect/base`.
  3.2.0 says its "OAS dialect schema id" is 3.1's `dialect/base` too,
  which looks like a mistake, since that dialect doesn't have 3.2's
  keywords, so 3.2's is the latest dated 3.2 dialect,
  `https://spec.openapis.org/oas/3.2/dialect/2026-02-26`. A new date
  changes it. Rejected: following the text, and no default for 3.2.
- A Path Item Object's `$ref` is one of its fields, so a Path Item with
  `$ref` is still walked. Any other Object with `$ref` is a Reference
  Object, which is data.
- The walk is from a grammar table for each version: which fields hold
  which Objects, and which hold Schema Objects (see
  [Where Schema Objects are](#where-schema-objects-are)). A Reference
  Object (`{ "$ref" }`) where an Object would be isn't followed. Every
  Schema Object is in a structural position or in `components`, so finding
  them needs no references.
- External references are in [External references](#external-references).
- Lint works on an OpenAPI document as it is: rules visit `json-schema`
  nodes, and the root isn't one. Rules about the discriminator read
  component names from the tree.

## External references

A document's type, and a schema's dialect, come from the document or its
environment when it's parsed, never from what refers to it. A reference
finds a schema only where the target document has one.

| Target | Result |
| --- | --- |
| Another OpenAPI document, like `common.json#/components/schemas/Pet` | Its own OpenAPI resolve finds the Schema Object |
| A schema with `$schema` | A schema in that dialect, as now |
| A schema document without `$schema`, like `pet.json` or any 3.0 schema file | A schema in the dialect its environment gives it |
| A location that isn't a schema, like `defs.json#/Pet` | An error, and lint reports it |
| A Reference Object to a document whose root is another Object, like a Parameter | Not followed; not supported |

- The environment is per document: a registry entry's `dialectUri`, the
  `Content-Type`'s `schema` parameter, and in the CLI, file patterns that
  give matching files a dialect. So one config can have a 3.0 description
  and a 3.1 one. The config's `defaultDialectUri` still applies only to
  documents that are schemas already, like `.schema.json`, and the
  JSON-or-schema plugin still reads a `.json` without `$schema` or
  `openapi` as JSON.
- OpenAPI says every document in a description MUST have an OpenAPI
  Object or a Schema Object at its root, so the error for the last two
  rows can say that. Appendix G leaves other documents
  implementation-defined.

Rejected:

- The referrer's dialect for a target without `$schema`. A schema would
  mean something different depending on what refers to it: a draft-07
  file without `$schema` would be 2020-12 when a 2020-12 schema refers to
  it.
- The config's `defaultDialectUri` for `.json` without `$schema`, with
  the JSON-or-schema plugin reading those as schemas when there's a
  default. It's one dialect for every description a config has, and an
  instance file in a session with a default would be read as a schema.
- A reference carrying what it expects to the target's parse. Browser
  would pass a context to plugins, and a document parsed in two contexts
  would conflict, which Appendix G says MAY be an error.
- A reference applying its target as a schema when the target isn't one,
  in the dialect of the resource it's in, which would also have made
  references into unknown keywords work, like `definitions` in 2020-12. In place in the tree, which a
  node can be because data carries nothing but its type, the resolver
  can only do it for references in the same document: a document parsed
  already can't change because another document refers to it, since
  sessions share resolved registry entries and a document can't change
  what another's reference finds. Across documents, it would need a copy
  resolved when the reference is followed, cached in the session, which
  is a second mechanism, puts resolving in lowering, and hides those
  schemas from lint and the language server. Working in a document and
  not across documents isn't worth having.

## Where Schema Objects are

Every version:

- OpenAPI Object: `paths` (Paths), `components` (Components)
- Paths: `/{path}` (Path Item)
- Path Item: `get`, `put`, `post`, `delete`, `options`, `head`, `patch`,
  `trace` (Operation), `parameters` (array of Parameter)
- Operation: `parameters` (array of Parameter), `requestBody` (Request
  Body), `responses` (Responses), `callbacks` (map of Callback)
- Callback: `{expression}` (Path Item)
- Responses: `default` and status codes (Response)
- Response: `headers` (map of Header), `content` (map of Media Type)
- Request Body: `content` (map of Media Type)
- Parameter and Header: `schema` (Schema), `content` (map of Media Type)
- Media Type: `schema` (Schema), `encoding` (map of Encoding)
- Encoding: `headers` (map of Header)
- Components: `schemas` (map of Schema), `responses`, `parameters`,
  `requestBodies`, `headers`, `callbacks` (maps of those)

3.1 adds `webhooks` (map of Path Item) to the OpenAPI Object, and
`pathItems` (map of Path Item) to Components.

3.2 adds:

- Path Item: `query` (Operation), `additionalOperations` (map of
  Operation)
- Media Type: `itemSchema` (Schema), `prefixEncoding` (array of Encoding),
  `itemEncoding` (Encoding)
- Encoding: `encoding` (map of Encoding), `prefixEncoding`, `itemEncoding`
- Components: `mediaTypes` (map of Media Type)

## Stages

1. The JSON Schema resolver resolving a schema at a node in a given
   resource, the OpenAPI resolver with the grammar tables, and
   `openApiMediaType` for JSON, so `openapi.json#/components/schemas/Pet`
   compiles and an OpenAPI document lints. Built.
2. Sniffing `openapi` in `.json`, and the CLI's file patterns for the
   dialect of schema files without `$schema`, so a referenced `pet.json`
   works there. From code, a registry entry's `dialectUri` already does.
3. The discriminator's lint rules (see [OpenAPI 3.0, 3.1, and
   3.2](openapi.md)).
4. YAML, as its own plugin.

## Open questions

- The default for a version without the meta-schema in the registry:
  3.1's and 3.2's dialects are their meta-schemas, so a document without
  `jsonSchemaDialect` needs the default one there.
- How the CLI's file patterns reach the parse: a registry of the matched
  files with their `dialectUri`, or something else. And whether a `.json`
  that matches is a schema.
- `operations` like `compile` take a schema URI. A URI into an OpenAPI
  document works once the node there is a schema. Whether the document's
  URI on its own should mean anything.
