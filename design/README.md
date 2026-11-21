# Design

A from-scratch rewrite of `@hyperjump/json-schema` v1 (the `main` branch)
built on [`@hyperjump/browser`](https://github.com/hyperjump-io/browser) v2
and [unified](https://unifiedjs.com/). Most of the same concepts are
included, but often redesigned.

These documents record decisions: what the code does, why, and what was
rejected and why. They don't record history, such as what the code used
to do or when it changed. That's in git. The `.d.ts`
files in `src/` are the source of truth for the API. They're written by
hand and have JSDoc explaining the details. Documentation for users is in
[`website/`](../website/README.md).

## Goals

- Optimized for the JSON Schema v1 dialect, but capable of supporting
  draft-04 and later.
- Everything is per instance. No global state (see
  [No global state](principles/no-global-state.md)).
- Built on unified so schema documents and instances can be ASTs with
  positions. The language server is a first-class use case.
- Dependent projects (`json-schema-errors`, `json-schema-coverage`,
  `json-schema-language-tools`) don't need to keep working. They'll be
  migrated if this works out.

## How it's organized

- **[Principles](principles/README.md)**: the rules decisions are made by.
- **[Style](style/README.md)**: how code here is laid out and written.
- **Specs**: contracts other code builds on.
  - [The kernel](specs/kernel/README.md): the language keywords lower to
  - [Keywords](specs/keyword/README.md): what a keyword definition is
  - [Schema AST](specs/schema-ast.md)
- **Components**: how each part works, what was decided, and what was
  rejected. Open questions and known limitations are with the component
  they're about.
- **[Benchmarks](benchmarks/README.md)**: the measurements behind the
  performance decisions.

## Components

- [Architecture](architecture.md): the pipeline, and a code map
- [The API as functions](components/api/README.md)
  - [Public API](components/api/public-api.md)
  - [JSON Schema as a media type](components/api/json-schema-media-type.md):
    the definitions on the media type plugin, and registries in browser
- [Dialects](components/dialects/README.md)
  - [Vocabularies](components/dialects/vocabularies.md)
  - [Dialects from meta-schemas](components/dialects/from-meta-schemas.md)
  - [`x-` keywords](components/dialects/x-keywords.md)
- [Formats](components/formats.md)
- [Built-in dialects](components/built-in-dialects/README.md)
  - [Built-in keywords](components/built-in-dialects/built-in-keywords.md)
  - [2020-12](components/built-in-dialects/draft-2020-12.md),
    [2019-09](components/built-in-dialects/draft-2019-09.md), and
    [draft-04, draft-06, and draft-07](components/built-in-dialects/draft-04-06-07.md)
- [Schema validation](components/schema-validation.md)
- [Schema types](components/schema-types.md): checking schemas written in
  TypeScript
- [Sessions](components/sessions/README.md)
  - [What can be retrieved](components/sessions/allow-retrieval.md)
  - [The language server](components/sessions/language-server.md)
- [Registries](components/registries/README.md)
  - [Identification](components/registries/identification.md)
  - [Making sessions cheap](components/registries/cheap-sessions.md)
- [Validation API](components/validation-api/README.md)
  - [Annotations](components/validation-api/annotations.md)
- [Compile and evaluate](components/kernel/README.md)
  - [Evaluators](components/kernel/evaluators.md)
  - [Optimizations](components/kernel/optimizations/README.md)
  - [Evaluation state](components/kernel/evaluation-state.md)
  - [Plugins](components/kernel/plugins.md)
  - [Output formats](components/kernel/output-formats.md)
- [Bundling](components/bundling.md)
- [Identifiers](components/identifiers.md)
- [Referenced schemas](components/referenced-schemas.md)
- [Local paths in messages and output](components/file-uris.md)
- [Linting](components/lint/README.md)
  - [Validity and lint](components/lint/validity.md)
  - [Rules](components/lint/rules.md)
  - [The rule catalogue](components/lint/catalogue.md)
  - [Configuration comments](components/lint/configuration-comments.md)
  - [Other schemas](components/lint/other-schemas.md)
  - [Linting from code](components/lint/lint-api.md)
  - [What a keyword group does](components/lint/effect.md)
  - [Schema groups](components/lint/schema-groups.md)
- [Validating JSON files](components/validate-plugin.md)
- [CLI](components/cli.md)
- [Testing](components/testing.md)
- [Browser v2](components/browser-v2.md): what this relies on from browser
