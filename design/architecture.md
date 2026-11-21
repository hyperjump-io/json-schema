# Architecture

```text
text ─ fromJson ─▶ JSON AST ─ resolveSchema ─▶ Schema AST ─ (schema validation) ─▶ lower ─▶ kernel ─ optimize ─▶ kernel ─ fast / instrumented ─▶ closures
       (browser)                  (async)                                                  (async)                              (sync, lazy)
```

- A config is browser's, with the JSON Schema media types, which have the
  definitions, and a registry, a `SchemaRegistry`. A session is browser's,
  a `Hyperjump` made from a config, which asks the registry before it
  retrieves anything. Schemas are retrieved,
  browsed, and compiled in a session (see [Sessions and registries](components/sessions/README.md)).
- Schemas are retrieved with browser's `browse`. The schema media type plugin
  (`application/schema+json`, `.schema.json`) parses with `fromJson` and
  resolves with `resolveSchema` (`jsonSchemaResolve` is the same as a
  unified plugin). Any problem from either is fatal there: it throws a
  `SchemaError` with all of them (see [Validation API](components/validation-api/README.md)).
- A JSON document (`application/json`, `.json`) is a schema if its
  top-level `$schema` is a dialect the session has or can find
  (the second of the JSON Schema media types, which replaces browser's
  JSON plugin), and
  JSON otherwise. A schema document has `anchors` and a JSON document
  doesn't, so each one's fragments are its own. Rejected: only
  `.schema.json` files and `application/schema+json` responses being
  schemas, with a workspace registry giving the CLI its `.json` schemas.
  Many projects don't use `.schema.json`.

## Code map

| Where | What |
| --- | --- |
| `src/json-schema.js` | `jsonSchemaConfig`: a config with the JSON Schema media types. `src/media-types.js` makes the definitions and the media types that carry them, and `src/definition-of.js` finds them in a config |
| `src/operations/` | The operations: `validate`, `validator`, `annotate`, `annotator`, `compile`, `serialize`, `restore`, `bundle`, `lint`, and what they share (`call-session.js`, `schema-source.js`, `evaluators.js`). `validatorFor` and `annotatorFor` are in `validate-compiled.js`, apart from the others, because they import the instrumented evaluator |
| `src/session.js` | What a session keeps for schemas, and `getDialect` |
| `src/annotation.js` | `annotation`, which reads an annotation by keyword name |
| `src/keyword.d.ts`, `src/dialect.d.ts`, `src/format.d.ts` | What a keyword, dialect, and format are |
| `src/schema/` | Text to schema AST: the media type plugin, `resolveSchema` and `jsonSchemaResolve`, schema validation, and the schema AST types |
| `src/kernel/` | Schema AST to results: the kernel's expressions (`kernel.d.ts`), `lower` (compiling), the normal form, `optimize`, the definitions a kernel uses (`definitions.js`), the evaluators (`fast.js` for plain values without plugins, `instrumented.js` for everything else), `Validator`, instance operations, and evaluation plugin types. See [the kernel spec](specs/kernel/README.md) |
| `src/kernel/optimizations/` | Optimization passes on kernel expressions, one per file. `index.js` lists them in the order they run |
| `src/output/` | Output formats and validation errors |
| `src/registry/` | `SchemaRegistry`, indexing registries, and how a session finds schemas in them |
| `src/dialects/` | The built-in dialects: `v1`, `draft-04` … `draft-2020-12`, and `openapi-3-0` … `openapi-3-2`. Each has the dialect, with the definitions it uses, and its tests, including the test suite runners. OpenAPI 3.1 and 3.2 have their vocabularies instead, because their meta-schemas define their dialects. `extend-dialect.js` has `extendDialect` |
| `src/keywords/` | Keyword definitions, and `checks.js`, the checks they share for their values |
| `src/formats/` | Format definitions, and the lite and full format lists |
| `src/bundle/` | Bundling, which embeds referenced schemas in one document, and its tests, ported from v1 |
| `src/lint/` | Lint rules (`rules/`, one per file), the recommended preset, `lintRule`, which applies configuration comments, and the utilities rules share |
| `src/validate/` | `jsonSchemaValidate`, the unified plugin that validates JSON files |
| `src/lint/test-linter.js` | The processor lint rule tests use, which resolves like the CLI |
| `test/test-suite.js` | Runs the JSON Schema Test Suite and the annotation test suite |
