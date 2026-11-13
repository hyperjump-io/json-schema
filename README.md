# Hyperjump - JSON Schema

A JSON Schema validator and linter built on
[`@hyperjump/browser`](https://github.com/hyperjump-io/browser) and
[unified](https://unifiedjs.com/).

- Dialects: v1, draft-2020-12, draft-2019-09, draft-07, draft-06, draft-04
- Get a boolean, errors, or annotations, for a plain JS value, JSON text, or
  a JSON AST. See [Validating](website/guides/validating.md).
- With JSON text, every error has a position, and syntax errors are reported
  with validation errors
- Annotations come back as an AST with annotations on its nodes
- Schemas from `http(s):`, `file:`, or in-memory registries
- Lint schemas to find likely mistakes in schemas, with a recommended preset.
- Custom keywords, formats, dialects, vocabularies, output formats, linter rules,
  and evaluation plugins

**Status:** Experimental and unpublished. It depends on unreleased versions of
`@hyperjump/browser` (v2) and `@hyperjump/uri`. The API will change. See
[the design docs](design/README.md) for the decisions made so far.

## Install

```bash
npm install @hyperjump/json-schema
```

## Documentation

The documentation is in [`website/`](website/README.md). Start with
[Getting started](website/getting-started.md).

## Contributing

`@hyperjump/browser` and `@hyperjump/uri` are linked from sibling directories
(`../browser-v2`, browser's `v2` branch, and `../uri`).

### Tests

Run the tests

```bash
npm test
```

Run the tests with a continuous test runner

```bash
npm test -- --watch
```

Lint and type-check

```bash
npm run lint
npm run type-check
```

The design docs, specs, principles, and style guide are in
[`design/`](design/README.md).
