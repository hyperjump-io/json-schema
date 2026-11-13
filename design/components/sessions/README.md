# Sessions

With one document cache for a `JsonSchema`'s whole life, a registry for
one compilation would be visible to compilations running at the same time,
and nothing could be removed without leaving resolved documents behind that
depended on it. So state is separated by how long it lives.

## Two levels

| Level | What it is | What it has |
| --- | --- | --- |
| Long-lived | `JsonSchema` | keywords and their schemas, formats, dialects, output formats, the `registry` every session sees, the config, and the stack every session retrieves through |
| Session | a value made by `jsonSchema.session()` | browser's session (a `Hyperjump`), its own `registry`, the documents it retrieves, its resources, and the dialects it builds from meta-schemas |

- The long-lived level only has state that doesn't depend on a session.
  Definitions and the stack, with its HTTP cache, are the same for every
  session. Anything that depends on registries, including every resolved
  document, belongs to a session and goes away with it, so nothing is ever
  left behind.
- `JsonSchema` isn't a `Hyperjump`. Browser has one level: a session, made
  from a configuration that's a value. `JsonSchema` keeps the
  configuration and the stack, and makes a `Hyperjump` for each session
  from them (see [Browser v2](../browser-v2.md)).
- A session is a plain value: `{ hyperjump, jsonSchema, fetch, state,
  contextUrl, config }`. It's what browser's `get`, `getDocument`, and
  `jref*` functions take (a `DocumentSession`), so schemas are browsed
  with browser's own functions.
  - `fetch` asks the registries, then the `Hyperjump`. A registry's schema
    isn't retrieved, so it isn't in the stack, and `allowRetrieval` doesn't
    apply to it (see [Registries](../registries/README.md)).
  - `state`, `contextUrl`, and `config` are the `Hyperjump`'s.
  - What's the `Hyperjump`'s alone is reached through `hyperjump`:
    watching its requests, tracing them, and closing it.
- What this package adds to browsing is functions of a session:
  `getDialect(session, uri)` and `annotation(session, node, keyword)`.
  `get` and `getDocument` are browser's, exported from here as they are.
- What a session keeps for schemas is in its state
  (`session.state`): its registries, its resources by URI (see
  [Schema AST](../../specs/schema-ast.md)), and the dialects it built. A
  resource's document is added when a schema media type plugin parses it
  (`addResources`), which checks that one URI identifies one resource.
- There's no default session. Browsing needs a session, because a node
  needs one to follow references.
- An operation given a `JsonSchema` (`compile(jsonSchema, uri, { registry })`)
  starts a session for that call, so each call sees changes, and calls that
  run at the same time can't see each other's registries. Given a session,
  it runs in that session. A compiled schema doesn't need its session
  after compiling, because its kernel is self-contained. Sessions only
  browse; compiling, bundling, and linting are functions (see
  [Validation API](../validation-api/README.md)).
- A schema with problems fails its retrieval with its `SchemaError`, which
  is what `get`, `getDocument`, and the operations throw. Nothing wraps it.
- Dialects from the config belong to `JsonSchema`, and its `getDialect`
  only finds those. A dialect built from a meta-schema belongs to the
  session that built it. `getDialect(session, uri)` finds both, and it's
  what the resolver and the compiler use.
- Browser gives a media type plugin the session a document is being
  retrieved in (`parse(response, session)`), so the schema media type
  plugins resolve schemas in that session. Retrieving a schema in a session
  that isn't a `JsonSchema`'s is an error.
- What a session finds is typed by its media types. A reference can lead to
  any document the session can read, so `get` and the `jref*` functions
  return a schema's node, a JRef node, a JSON node, or a node of one of the
  config's media types, and a schema's node is told by its `type`,
  `"json-schema"`.
  - `JsonSchema` and `JsonSchemaSession` have a type parameter for the
    config's media types, so those are in the type too.
  - A session that's only known as a `JsonSchemaSession` could have any
    media types, so what it finds is `unknown`. `isSchemaNode` and
    `isSchemaDocument` narrow it, and they're what this package's own code
    uses where it needs a schema.

Rejected:

- `JsonSchemaSession` as a class with `get`, `getDocument`, `getDialect`,
  and `annotation` as methods. It would hold a `Hyperjump` and forward to
  browser's functions, and its `get` would be browser's with another call
  shape.
- `get` and `getDocument` typed as returning a schema's node. A reference
  can lead to a document that isn't a schema, like a JRef or a JSON file,
  so the type would be wrong whenever one did.
- The config's media types left out of a session's type. A session with a
  media type of the application's could find one of its nodes, which the
  type wouldn't say.
- Resolving after retrieving, to take the session out of browser's
  `parse`: browser would only parse, and a `getDocument` of this package's
  would resolve what it returns. It moves the dependency instead of
  removing it. Resolving still needs the session, for dialects, and moving
  it needs a cache of resolved documents next to browser's, the
  `Content-Type`'s `schema` and `profile` parameters carried on the parsed
  document, and the check that a `.json` file is a schema moved out of the
  plugin. `parse` is where the response is, so it's where resolving
  belongs. Browser's extension point isn't about JSON Schema either: any
  media type that needs other resources to parse a document, like XML with
  external entities or JSON-LD contexts, needs the session there.

## Contents

- [What can be retrieved](allow-retrieval.md)
- [The language server](language-server.md)
- [Registries](../registries/README.md)
