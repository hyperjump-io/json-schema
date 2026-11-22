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
- Any `.json` whose top-level `openapi` is a string is an OpenAPI
  document. The JSON-or-schema plugin checks for it after `$schema`, so a
  schema with a `$schema` dialect is still a schema, and hands the text to
  the plugin the session has for `application/openapi+json`, found with
  browser's `mediaTypeForContentType`. So it doesn't import the OpenAPI
  module, which stays out of bundles that don't use it, and a session
  without the plugin reads the document as JSON. Without the plugin, that
  media type finds JSON-or-schema itself, by its `+json` suffix, which
  isn't handed to. The OpenAPI plugin reports a version it doesn't read.
  Rejected: only the media type and the file name, which leaves
  `petstore.json` as JSON unless it's configured.
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
- The default without `jsonSchemaDialect` is the user's, given to the
  plugin: `openApiMediaType({ defaultDialects: { "3.1": uri, "3.2": uri } })`,
  keyed by major and minor version. 3.0's is
  `https://spec.openapis.org/oas/3.0/dialect`, unless it's given, because
  OpenAPI publishes no dialect for 3.0, and that's ours. 3.1 and 3.2 have
  none: a document without `jsonSchemaDialect` is one `missing-dialect`
  error at `openapi`, and its Schema Objects are data. Users bring the
  meta-schemas already, so they name the one that's the default too. That
  takes nothing here that follows OpenAPI's dates, and no reading of 3.2.0,
  whose "OAS dialect schema id" is 3.1's `dialect/base`, which doesn't have
  3.2's keywords. `openApiResolve` and `parseOpenApi` take the same option.
  A key that isn't a version this reads is a `TypeError`, because `3.0`
  written as a number is the key `"3"`. Rejected: defaults built in, 3.1's
  `dialect/base` and the latest dated 3.2 dialect, which the user's
  registry needs the meta-schemas for anyway, and a new date changed.
  Rejected: config dialects at the default URIs, so they'd work without a
  meta-schema, which is a dialect for each version again (see
  [OpenAPI 3.0, 3.1, and 3.2](openapi.md#dialects-from-meta-schemas)).
  Rejected: the default meta-schemas shipped as data, which saves only
  copying a file. Rejected: 2020-12 when the dialect can't be found, which
  is the wrong dialect without saying so.
- The dialect is found once, before the walk, and a problem with it is one
  error, where it was chosen: at `jsonSchemaDialect`, or at `openapi` for a
  default. Then every Schema Object is data. Every one needs it, even one
  with its own `$schema`, because the dialect is what finds its `$id`.
  Rejected: an error at each Schema Object, which `resolveSchemaAt` gave,
  with a retrieval for each.
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
- `openApiSchemaUri(version)` is the schema a document of a version is
  validated against, from the version table: OpenAPI's latest published
  `schema` for it, `oas/3.0/schema/2024-10-18`,
  `oas/3.1/schema/2026-11-05`, and `oas/3.2/schema/2026-11-12`. A new date changes it. Rejected:
  `schema-base`, which also validates Schema Objects against the default
  dialect, which resolving checks already, in each one's own dialect.
  Rejected: a `latest` URL for each version, which would follow new dates
  without a change here, because OpenAPI doesn't publish one. The
  schemas aren't included. `openApiSpecMediaType` retrieves them (see
  [OpenAPI 3.0, 3.1, and 3.2](openapi.md)).
- An OpenAPI document is both: an instance of its version's schema, and a
  document with schemas in it. The same AST can be validated and resolved,
  in either order, because validating only reads values and resolving
  annotates in place. The CLI does both (see its
  [Schema or instance](https://github.com/hyperjump-io/cli/blob/main/design/components/schema-or-instance.md)).
- A URI into an OpenAPI document is a schema only where the node is a
  Schema Object. The document's URI on its own isn't one, so `compile`,
  `validate`, and `bundle` with it are an `ERR_NOT_A_SCHEMA` error, as any
  location that's data is. `lint` takes the whole document. Rejected: the
  document's URI meaning its version's document schema
  (`openApiSchemaUri`), which the document is an instance of, not a schema
  in it, and compiling every Schema Object, which is one validator for
  many schemas. Bundling an OpenAPI description, its external references
  pulled into the document, is a feature of its own, not yet designed.
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
  `Content-Type`'s `schema` parameter, and in the CLI, its `defaultDialect`
  setting, which gives files that match a glob a dialect, with a media type
  plugin that gives their text to the schema media type with that `schema`
  parameter (see the CLI's
  [Default dialects](https://github.com/hyperjump-io/cli/blob/main/design/components/default-dialect.md)).
  So one config can have a 3.0 description and a 3.1 one. Rejected:
  expanding `defaultDialectUri` to take URL prefixes or a function, for
  the CLI's globs, which is the library doing what only the CLI needs. The config's `defaultDialectUri` still applies only to
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
  in the dialect of the resource it's in (see
  [Schema validation](../schema-validation.md) for why).

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
2. Sniffing `openapi` in `.json`, and the CLI's `defaultDialect` setting
   for the dialect of schema files without `$schema`, so a referenced
   `pet.json` works there. From code, a registry entry's `dialectUri`
   already does. Built.
3. The discriminator's lint rules (see [OpenAPI 3.0, 3.1, and
   3.2](openapi.md)). Built. `discriminator-without-composition` is built: a
   `discriminator` with no `oneOf`, `anyOf`, or `allOf` that no `allOf` in
   the document refers to, an error in every OpenAPI preset, because
   OpenAPI says a discriminator is "legal only when using" one of them. Which schemas
   are searched for an `allOf` is implementation-defined. 3.0.4
   RECOMMENDS every named schema in `components`, and every `allOf` in the
   document includes them. `discriminator-mapping-without-target` is
   built: a `mapping` or `defaultMapping` value that doesn't find a
   schema, an error like `reference-without-target`. A value that can be a
   component name is one, as 3.0.4, 3.1.1, and 3.2 RECOMMEND when it could
   be either, so a URI reference like one needs `./`, which they say
   authors MUST add. The message says to, so that MUST isn't a rule of its
   own. Rejected: a name only if a component has it, and a URI reference
   otherwise, which read `Bird` as a document next to this one, so a
   missing name was never reported. A URI reference into another document
   isn't checked, because rules don't retrieve anything, and a value isn't
   a reference that `LintDocument.found` has.
   `discriminator-property-optional` is built: a `discriminator` whose
   property is optional. 3.0.4 and 3.1.1 say it SHOULD be required, "as
   the behavior when the property is absent is undefined", so the rule is
   a warning in `openapi-3-0` and `openapi-3-1`. 3.2 says it MAY be optional,
   but then the Discriminator Object MUST have `defaultMapping`, so 3.2's
   is only reported without one, an error in `openapi-3-2`. The two are one
   rule, because they ask one question, and the presets give each version
   its severity. Rejected: a rule for each version. 3.2 doesn't say which
   schema decides that the property is optional, so it's required if
   every object valid against the schema with the `discriminator` has it
   (`propertyAlternatives`, over `LintDocument.reached`): `required` next
   to it, or in every `oneOf` alternative, as 3.2's examples do. It
   doesn't need component names, so it checks schemas in files of their
   own too. 3.2's "it is important that each subschema that defines a
   value for the discriminating property also define the property as
   required" isn't a requirement, so it isn't a rule.
4. YAML, as its own plugin. Not started.
