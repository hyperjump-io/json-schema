# Design

A from-scratch rewrite of [`@hyperjump/json-schema`](../json-schema) built on
[`@hyperjump/browser`](../browser) v2 and [unified](https://unifiedjs.com/).
Most of the same concepts are included, but often reimagined.

This document records the decisions made so far, what's done, and what's
next. The `.d.ts` files in `src/` are the source of truth for the API. They're
written by hand and have JSDoc explaining the details.

## Goals

- Optimized for the JSON Schema v1 dialect, but capable of supporting draft-04
  and later.
- Everything is per instance. No global state (v1's `registerSchema`,
  `addKeyword`, `setShouldValidateFormat`, … are all global).
- Built on unified so schema documents and instances can be ASTs with
  positions. The language server is a first-class use case.
- Dependent projects (`json-schema-errors`, `json-schema-coverage`,
  `json-schema-language-tools`) don't need to keep working. They'll be
  migrated if this works out.

## Architecture

```text
text ─ rejsonParse ─▶ JSON AST ─ jsonSchemaResolve ─▶ Schema AST ─ (schema validation) ─▶ compile ─▶ evaluate
       (browser)                  (async)
```

- `JsonSchema` extends browser's `Hyperjump<JsonSchemaNode>`, so the same
  object browses and validates schemas.
- Schemas are retrieved with browser's `get`. The schema media type plugin
  (`application/schema+json`, `.schema.json`) runs `rejsonParse` and
  `jsonSchemaResolve`. Any message from either is fatal there.
- Plain JSON files are never treated as schemas.

## Schema AST (`src/schema-ast.d.ts`)

A schema AST is a JSON AST with annotations. Nothing is moved, added, or
removed, so it stringifies back to the original document and every node keeps
its position.

- Value nodes are `type: "json"` (data), `"json-schema"` (with `dialectUri`),
  or `"reference"` (with `href`).
- Every property of an object schema has a `keywordUri`. Properties that
  aren't keywords in the dialect get
  `https://json-schema.org/keyword/unknown#<name>`. Tooling needs to identify
  unknown keywords even in dialects that don't allow them.
- `$ref` in draft-04 through draft-07 is a JRef-style `reference` node, not a
  keyword, so browser follows it and it never has a keyword location. Its
  other properties are plain JSON.
- A node's `location` is its canonical URI: relative to the schema resource
  that contains it, not the document.
- Embedded resources stay in the tree. Each resource gets a
  `JsonSchemaDocumentNode` whose root is the same node object. Every resource
  in a document shares one `embedded` map that includes all of them,
  including the root.
- Anchors and dynamic anchors are recorded per resource as JSON Pointers.
  2019-09's `$recursiveAnchor: true` is a dynamic anchor named `""`.

## Keywords (`src/keyword.d.ts`)

Keywords are plain, stateless objects so one definition can be shared by
every `JsonSchema` instance and every dialect. Anything instance-specific
should come through a context argument. (Classes with constructor injection
were considered. See "Open questions".)

- `uri`: Identifies the keyword independent of its name in any dialect.
- `shape`: Where the value contains schemas, using combinators: `"schema"`,
  `"data"`, `{ array: Shape }`, `{ map: Shape }`, or `Shape[]` (the first
  alternative whose JSON type matches). A value that doesn't match is data.
- `valueSchema`: A schema for the keyword's own value, used for schema
  validation. It doesn't describe subschemas; those are validated as schemas.
  Not evaluated yet.
- `resolve`: An optional hook for keywords that identify schemas (`$id`,
  `$anchor`, `$dynamicAnchor`, legacy `id`/`$id`/`$ref`, `$recursiveAnchor`).
  It records effects (`setBaseUri`, `addAnchor`, `addDynamicAnchor`,
  `setReference`) that are applied after every keyword in the schema has been
  seen, so keyword order doesn't matter. `setReference` makes the schema a
  reference node and discards everything else in it, including messages.
- Draft-specific identifier rules live in keyword definitions, not the core.
- `$schema` and unknown keywords are part of every dialect. The resolver maps
  `$schema` by name, and any other name the dialect doesn't define is
  unknown. Both definitions are added to every `JsonSchema` by default and are
  ordinary keywords otherwise. The unknown keyword can be replaced.

## Dialects (`src/dialect.d.ts`)

- A dialect is `{ uri, keywords, unknownKeywords }`. `keywords` maps names to
  keyword URIs. `unknownKeywords` is `"error"` (v1), `"annotation"` (2019-09,
  2020-12), or `"ignore"` (draft-04 through draft-07).
- There's no default dialect unless the user sets `defaultDialectUri` in the
  config. Otherwise, a schema whose dialect can't be determined is an error.
  The dialect comes from `$schema`, then the containing resource, then the
  `schema`/`profile` media type parameter, then the config.
- `$schema` is only allowed where a schema resource starts. Anywhere else,
  it's ignored with a message and the parent's dialect is used.
- Defined dialects can't be replaced. `removeDialect` must be called first.
- `extendDialect(uri, keywords)` adds keywords to a defined dialect. That's
  how users add custom keywords to v1. It can't replace a keyword. Dialects
  are never changed in place.
- Keyword names starting with `x-` are reserved for schema authors in every
  dialect. They're guaranteed to never collide with a keyword, so they must
  never assert. Registering one throws (`addVocabulary`, `addDialect`,
  `extendDialect`). They're always allowed in schemas, even when unknown
  keywords are errors.
- `$vocabulary` was removed in v1 but is still supported for 2019-09 and
  2020-12. A dialect that isn't defined is built from its meta-schema's
  `$vocabulary`. The meta-schema is retrieved with `get` and must be a schema.
  A self-describing meta-schema (its `$schema` is the URI it was retrieved
  from) defines its dialect while it's resolved. Meta-schemas that depend on
  each other are detected with `getDialect`'s `referencedFrom` option instead
  of waiting forever.

## Schema validation

v1 is designed to evolve compatibly, which is why it doesn't allow unknown
keywords. There's no static v1 meta-schema. What's valid depends on what the
implementation supports, including user-defined keywords, which can't change
an internal meta-schema.

- Schema validation is keyword by keyword, for every dialect. Schemas are
  never validated against a meta-schema.
- Unsupported keywords are reported by the resolver according to the
  dialect's `unknownKeywords`.
- Each keyword's `valueSchema` validates its value. This needs the evaluator,
  so it isn't implemented yet. It will be a unified plugin that runs after
  `jsonSchemaResolve`.
- Dialect schemas (meta-schemas) are for dev-time tooling, not validators.
  There's no generated "what this implementation supports" meta-schema.
- The resolver's own checks (misplaced `$schema`, duplicate ids and anchors,
  invalid identifiers) are schema validation too. Every problem is a
  `VFileMessage` with `source: "json-schema"` and a `ruleId`. Messages from a
  keyword hook use the keyword's URI as the `ruleId`.

## Validation API (`src/json-schema.d.ts`)

Designed but not implemented. The methods throw "Not implemented".

- `compile(uri)` returns a `Validator` with `validate`, `validateJson`,
  `annotate`, and `annotateJson`. `JsonSchema` has the same four as
  convenience methods that take a URI.
- `validate` never builds an AST. `annotate` validates and returns the
  instance as an AST, so users never need to call both. Each has a `Json`
  variant for text, which includes syntax errors with the validation errors.
  A JSON string is also a valid instance, so the variants can't share a
  function.
- FLAG output is a plain `boolean` to avoid allocating. BASIC and DETAILED are
  `{ valid, errors }`. Output formats are typed with an augmentable
  `OutputFormats` interface. A new output format spec is in progress and
  should be supported eventually.
- Errors are `VFileMessage`s. Validation errors add keyword location,
  absolute keyword location, and instance location. Text input adds
  positions. Any syntax error makes the instance invalid, but it's still
  validated as far as it could be parsed.
- `annotate` returns `{ output, status, node }`. Annotations are
  `node.data.annotations`, a `Map` of annotation keyword URI to values.
- In a broken (error-tolerant) tree, keywords skip `json-missing` and
  `json-invalid` nodes, and `required` counts a property with a missing value
  as present, so the syntax error is the only error for it.
- Extra information for the language server (schema locations, evaluated
  branches) will come from evaluation plugins.

## Open questions

- **Compile and evaluate.** The next big design. There's an exploratory
  discussion (not a plan) about lowering schemas to an IR, running
  optimization passes, and generating closures (no `eval`), with source-map
  style provenance for error locations and keywords and plugins declaring what
  they observe so the optimizer can respect them. Requirements: fast on plain
  JS values, exact error locations, and extensibility (user keywords and
  plugins can run arbitrary code) can't be traded away for speed. It needs to
  evaluate both plain values (`validate`) and ASTs (`annotate`), probably as
  separate specializations of the same compiled schema.
- **Where keywords get their dependencies.** From a context argument
  (stateless, shareable keywords; current lean) or constructor injection
  (matches browser's plugins).
- **Evaluating unknown keywords.** Their `keywordUri` is
  `…/unknown#<name>`, but the definition is registered as `…/unknown`.
- **Which dialect value schemas are written in.** Probably v1.
- **Evaluation plugins and custom output formats.** Not designed yet.

## Status

Done:

- Project setup (`oxlint`, `vitest`, `tsc` with declaration files checked,
  `typedoc`).
- Validation API types.
- Schema AST, keyword, and dialect types.
- `jsonSchemaResolve`, `JsonSchema` registries, and the schema media type
  plugin, with tests.
- Keyword definitions with resolve hooks: `$schema`, unknown, `$id`,
  `$anchor`, `$dynamicAnchor`, draft-04 `id`/`$ref`, and 2019-09
  `$recursiveAnchor`. Other keywords only need shapes and value schemas, so
  they'll be added with the compile side.

Changes made to browser for this (on its `v2` branch):

- A type parameter for property node annotations, and JSON AST utilities that
  are generic over the node type.
- A generic `DocumentNode<T>`.
- Embedded documents can be found from any document in the same compound
  document.
- A file's media type uses the longest matching extension.
- `content-type` v3, with the parsed type validated.

## Plan

1. Design compile and evaluate: the keyword compile interface, evaluation
   plugins, and output formats.
2. Implement the core and the v1 keywords (shapes and value schemas) and a v1
   preset. Run the JSON-Schema-Test-Suite.
3. Schema validation with value schemas.
4. Presets for 2020-12, 2019-09, and draft-04 through draft-07. Move the
   `$vocabulary` support into the 2019-09 and 2020-12 presets as a hook the
   core doesn't need.
5. Runtime classes for `ValidationError`, `DetailedValidationError`, and
   `InvalidSchemaError`. They're only declared so far.
6. A registry for schemas that aren't retrieved by URI (deferred; schemas come
   from `file:` and `http(s):` for now).
7. Later: annotations, bundling, OpenAPI, a CLI, a unified plugin for
   validating JSON files, and migrating dependent projects.

## Known limitations

- `@hyperjump/browser` v2 isn't published, so it's a `file:../browser`
  dependency.
- The base URI from a file's path only handles POSIX paths.
- A self-describing meta-schema is recognized by the URI it was retrieved
  from. A copy retrieved from a different URI than its `$id` isn't recognized,
  and that's reported as an error.
