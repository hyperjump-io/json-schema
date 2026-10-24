# Hyperjump - JSON Schema

A JSON Schema validator and linter built on
[`@hyperjump/browser`](https://github.com/hyperjump-io/browser) and
[unified](https://unifiedjs.com/).

- Dialects: v1, draft-2020-12, draft-2019-09, draft-07, draft-06, draft-04
- Get a boolean, errors, or annotations, for a plain JS value, JSON text, or
  a JSON AST. See [Modes](#modes).
- With JSON text, every error has a position, and syntax errors are reported
  with validation errors
- Annotations come back as an AST with annotations on its nodes
- Schemas from `http(s):`, `file:`, or in-memory registries
- Lint schemas to find likely mistakes in schemas, with a recommended preset.
- Custom keywords, formats, dialects, vocabularies, output formats, linter rules,
  and evaluation plugins

**Status:** Experimental and unpublished. It depends on unreleased versions of
`@hyperjump/browser` (v2) and `@hyperjump/uri`. The API will change. See
[DESIGN.md](DESIGN.md) for the decisions made so far and what's next.

## Install

```bash
npm install @hyperjump/json-schema
```

## Usage

```javascript
import { JsonSchema, SchemaRegistry } from "@hyperjump/json-schema";
import { addV1 } from "@hyperjump/json-schema/v1";

const jsonSchema = new JsonSchema();
addV1(jsonSchema);

jsonSchema.addRegistry(new SchemaRegistry().with({
  $schema: "https://json-schema.org/v1",
  $id: "https://example.com/person",
  title: "Person",
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer", minimum: 0 }
  },
  required: ["name"]
}));

const validator = await jsonSchema.compile("https://example.com/person");

validator.validate({ name: "Jason", age: 42 }); // true
validator.validate({ age: -1 }); // false
```

A `Validator` can be used for any number of instances. `jsonSchema.validate(uri,
instance)` is a shortcut, but it compiles the schema every time.

### Modes

A validator works in three modes, on three kinds of instance.

| | JS value | JSON text | JSON AST |
| --- | --- | --- | --- |
| **Flag** | `validate(value)` | `validateJson(text)` | `validateNode(node)` |
| **Errors** | `validate(value, { output })` | `validateJson(text, { output })` | `validateNode(node, { output })` |
| **Annotations** | `annotate(value)` | `annotateJson(text)` | `annotateNode(node)` |

- **Flag** is just a boolean. It's the default, and the fastest.
- **Errors** says why an instance is invalid. Use the BASIC or DETAILED
  output format.
- **Annotations** validates and returns the instance as an AST with
  annotations on its nodes. It takes an `output` option too.
- **JSON text** is parsed error-tolerantly. Syntax errors are reported with
  validation errors, and every error has a position.
- **JSON AST** is a node you already have, such as a value in a schema AST.

### Output

The default output is FLAG: just a boolean, which is the fastest. Use BASIC or
DETAILED to find out why an instance is invalid.

```javascript
const result = validator.validate({ age: -1 }, { output: "BASIC" });
// {
//   valid: false,
//   errors: [
//     {
//       source: "json-schema",
//       ruleId: "https://json-schema.org/keyword/minimum",
//       absoluteKeywordLocation: "https://example.com/person#/properties/age/minimum",
//       instanceLocation: "/age",
//       place: undefined
//     },
//     ...
//   ]
// }
```

- BASIC is a flat list of errors.
- DETAILED nests errors by schema structure.

Errors from the built-in output formats are plain data, without messages.
Writing messages that explain errors is left to other output formats. Add your
own with `addOutputFormat`. `outputErrorMessage` gives an error a generic
message.

```javascript
import { outputErrorMessage } from "@hyperjump/json-schema";

outputErrorMessage(result.errors[0]);
// "'/age' fails the constraint at 'https://example.com/person#/properties/age/minimum'"
```

### JSON text

`validateJson` parses JSON text and validates it. The parse is error-tolerant,
so syntax errors are reported along with validation errors, and every error has
a position.

```javascript
const result = validator.validateJson(`{ "name": "Jason", "age": -1, }`, { output: "BASIC" });
// {
//   valid: false,
//   errors: [
//     {
//       source: "json-schema",
//       ruleId: "https://json-schema.org/keyword/minimum",
//       absoluteKeywordLocation: "https://example.com/person#/properties/age/minimum",
//       instanceLocation: "/age",
//       place: { start: { line: 1, column: 27, offset: 26 }, end: { line: 1, column: 29, offset: 28 } }
//     },
//     {
//       source: "json",
//       ruleId: "trailing-comma",
//       place: { start: { line: 1, column: 29, offset: 28 }, end: { line: 1, column: 30, offset: 29 } }
//     }
//   ]
// }
```

`validateNode` validates a JSON AST node, such as a value in a schema AST.

### Annotations

`annotate` validates and returns the instance as a JSON AST
([unist](https://github.com/syntax-tree/unist)) with annotations attached to its
nodes. `annotateJson` does the same for JSON text. `annotateNode` attaches
annotations to a JSON AST node you pass it and returns only the output.
Annotations are a `Map` of keyword URI to the values collected for that node.

```javascript
const { output, node } = validator.annotate({ name: "Jason" });

node.data.annotations;
// Map { "https://json-schema.org/keyword/title" => ["Person"] }
```

Annotations follow the spec. They're only kept for the parts of the schema the
instance passed.

### Where schemas come from

A schema is looked up in registries first, then retrieved by its URI.

- **Registries:** A `SchemaRegistry` holds schemas that aren't retrieved. A
  schema is identified by its `$id`, or by `retrievalUri` if it doesn't have
  one. A registry never changes. `with` and `without` return a new one.

  ```javascript
  const registry = new SchemaRegistry()
    .with(schema)
    .with(schemaText, { retrievalUri: "https://example.com/other" });
  ```

  Add a registry to the `JsonSchema` with `addRegistry`, or use one for a
  single compilation with `compile(uri, { registries: [registry] })`.

- **Files and HTTP:** `file:` and `http(s):` URIs are retrieved, if
  `allowRetrieval` allows them (see below). Only `application/schema+json`
  responses and `.schema.json` files are schemas. A plain `.json` file isn't.
  Relative references work as you'd expect.

  ```javascript
  import { pathToFileURL } from "node:url";

  const uri = pathToFileURL("./person.schema.json").href;
  const validator = await jsonSchema.compile(uri);
  ```

Schemas aren't trusted, so a schema can't make your application retrieve
whatever it names, like an internal address or a file outside your project.
Only what the `allowRetrieval` config allows is retrieved. It's a list of
URLs. One that ends with `/` allows everything under it, and any other allows
only itself. A relative one is resolved against the working directory in
Node.js and the page in a browser. The default is `["./"]`, which is what's
local to your application: files in the working directory in Node.js, and
what's in the page's directory in a browser. Anything else is a
`RetrievalNotAllowedError`. Registries are never checked.

```javascript
const jsonSchema = new JsonSchema({
  allowRetrieval: ["./", "https://schemas.example.com/"]
});
```

A session can have its own list, which it uses instead, for when different
parts of your application can retrieve different things.

```javascript
const session = jsonSchema.session({ allowRetrieval: ["./schemas/"] });
```

In Node.js, `file:` URLs are compared by their real paths, so a symlink can't
lead outside a directory you allow. A response is checked again by the URL it
came from, so a redirect can't lead somewhere you didn't allow. The
redirected request is still sent, though. Its response just isn't used. Use
`[]` to allow nothing but registries. In a worker, there's no page to
resolve relative URLs against, so use absolute ones.

To send headers with `http(s):` requests, such as credentials, replace the
`http(s):` plugin with one that has a `headers` option. It's called with
each URL that's requested, so only send credentials to the origins they're
for. A schema can name any URL. It can be async, so you can refresh a token.
Replacing the plugin replaces its cache too, so give it one.

```javascript
import { HttpUriSchemePlugin, MemoryHttpCacheStore } from "@hyperjump/browser";

jsonSchema.addUriSchemePlugin(new HttpUriSchemePlugin(jsonSchema, {
  cache: new MemoryHttpCacheStore(),
  headers: (url) => url.origin === "https://schemas.example.com"
    ? { Authorization: `Bearer ${process.env.SCHEMAS_TOKEN}` }
    : undefined
}));
```

### Dialects

A `JsonSchema` starts without any dialects. Add the ones you need from their
modules. Presets don't depend on each other, so add only what you use.

```javascript
import { addDraft202012 } from "@hyperjump/json-schema/draft-2020-12";
import { addDraft07 } from "@hyperjump/json-schema/draft-07";

addDraft202012(jsonSchema);
addDraft07(jsonSchema);
```

| Module | Add with | Dialect URI |
| --- | --- | --- |
| `@hyperjump/json-schema/v1` | `addV1` | `https://json-schema.org/v1` |
| `@hyperjump/json-schema/draft-2020-12` | `addDraft202012` | `https://json-schema.org/draft/2020-12/schema` |
| `@hyperjump/json-schema/draft-2019-09` | `addDraft201909` | `https://json-schema.org/draft/2019-09/schema` |
| `@hyperjump/json-schema/draft-07` | `addDraft07` | `http://json-schema.org/draft-07/schema` |
| `@hyperjump/json-schema/draft-06` | `addDraft06` | `http://json-schema.org/draft-06/schema` |
| `@hyperjump/json-schema/draft-04` | `addDraft04` | `http://json-schema.org/draft-04/schema` |

A schema's dialect comes from `$schema`. There's no default. A schema without
one is an error unless it's embedded in a schema that has one, or you set one.

```javascript
const jsonSchema = new JsonSchema({ defaultDialectUri: "https://json-schema.org/v1" });
```

Custom meta-schemas that use `$vocabulary` (2019-09 and 2020-12) define their
own dialects. Use `addVocabulary` from either of those modules to add
vocabularies they can use.

Unknown keywords are errors in v1, except ones that start with `x-`, which
are annotations. They're annotations in 2019-09 and 2020-12, and ignored in
draft-04 through draft-07.

### Formats

`format` validates by default in v1 and draft-04 through draft-07. It's only an
annotation in 2019-09 and 2020-12. The `validateFormats` config overrides the
dialect.

```javascript
const jsonSchema = new JsonSchema({ validateFormats: true });
```

Each preset adds the formats its dialect defines, except `hostname`,
`idn-hostname`, and `idn-email`. Those need large tables of Unicode data, so
they're only loaded if you ask for them. (draft-04 and draft-06 have their own
`hostname`, which doesn't.)

```javascript
import { addFullFormats } from "@hyperjump/json-schema/formats/full";

addFullFormats(jsonSchema);
```

The [`hjlint`](https://github.com/hyperjump-io/hjlint) CLI has every format.

### Invalid schemas

Schemas are always validated before they're used. A schema that isn't valid
can't be retrieved, so `compile` throws a `RetrievalError` from
`@hyperjump/browser`. Its `cause` is the problem, with a position if the
schema was JSON text.

```javascript
jsonSchema.addRegistry(new SchemaRegistry().with(`{
  "$schema": "https://json-schema.org/v1",
  "$id": "https://example.com/bad",
  "minLength": -1
}`));

try {
  await jsonSchema.compile("https://example.com/bad");
} catch (error) {
  String(error.cause); // "4:16-4:18: Expected a non-negative integer"
}
```

### Linting schemas

Lint rules find things that are likely mistakes in a schema that still works,
such as `then` without `if`. Run them with the
[`hjlint`](https://github.com/hyperjump-io/hjlint) CLI, whose README says how
to configure them, or from code (see [Linting in a pipeline](#linting-in-a-pipeline)).
The recommended preset, `@hyperjump/json-schema/lint/recommended`
(`hjlint/recommended` in `hjlint`), turns on every rule that's likely a
mistake. They're warnings, except for ones that find a schema that can't be
compiled, like a `$ref` that doesn't find a schema, or one the spec doesn't
allow, like a v1 `$schema` with a fragment, which are errors.

| Rule | Reports |
| --- | --- |
| `then-else-without-if` | `then` or `else` without `if` |
| `if-without-then-else` | `if` without `then` or `else` |
| `empty-then-else` | `then` or `else` that every value is valid against, like `{}`, so it has no effect |
| `false-then-else` | `then` or `else` that's `false`, where `not` or the `if` schema says the same thing, or both `false`, so nothing is valid |
| `duplicate-enum-values` | A value in `enum` that's equal to one before it |
| `empty-enum` | An `enum` with no values, which nothing is valid against |
| `empty-type` | A `type` that's an empty array, which nothing is valid against |
| `duplicate-one-of-schemas` | A schema in `oneOf` that's equal to one before it, so a value it matches always fails |
| `duplicate-all-of-any-of-schemas` | A schema in `allOf` or `anyOf` that's equal to one before it, so it has no effect |
| `contradictory-limits` | A lower limit above its upper limit, like `minimum` above `maximum` or `minLength` above `maxLength`, or more required properties than `maxProperties` allows |
| `impossible-property` | A property no valid object can have, because an object with it needs more properties than `maxProperties` allows, like a `dependentRequired` that depends on it |
| `redundant-numeric-limit` | `maximum` and `exclusiveMaximum`, or `minimum` and `exclusiveMinimum`, where the looser one has no effect |
| `single-value-range` | `minimum` and `maximum` with the same value where `type` only allows numbers, which `const` says more directly |
| `fractional-limit-for-integer` | A numeric limit that isn't an integer, where `type` only allows integers, so it's the same as an integer limit |
| `unsafe-integer-limit` | A limit beyond ±2⁵³ - 1 where `type` only allows integers, which implementations that use doubles may compare inexactly |
| `multiple-of-one` | `multipleOf: 1` where `type` allows numbers, which `type: "integer"` says more clearly, or where `type` only allows integers, so it has no effect |
| `single-type-array` | `type` that's an array of one type, like `["string"]`, instead of the type on its own |
| `additional-items-without-items-array` | `additionalItems` without an `items` that's an array of schemas (draft-04 through 2019-09) |
| `ignored-ref-siblings` | A property next to `$ref` in draft-04 through draft-07, where `$ref` replaces the whole schema |
| `misnamed-definitions` | `definitions` in 2019-09 and later, or `$defs` in draft-04 through draft-07, where it isn't a keyword, so what's in it isn't a schema |
| `const-and-enum` | `const` and `enum` in the same schema, where `enum` either has no effect or nothing is valid |
| `single-value-enum` | `enum` with only one value, which `const` says more directly (draft-06 and later) |
| `content-schema-without-media-type` | `contentSchema` without `contentMediaType` |
| `dependency-on-required-property` | A dependency in `dependentRequired`, `dependentSchemas`, or `dependencies` on a property that's in `required`, so it always applies |
| `required-dependent-property` | A property a dependency in `dependentRequired` or `dependencies` requires that `required` already requires, so requiring it there has no effect |
| `keyword-for-disallowed-type` | A keyword or known format for one type of value, like `minimum`, `properties`, or the `date` format, in a schema whose `type` doesn't allow that type |
| `min-properties-covered-by-required` | `minProperties` that's no more than the number of properties in `required`, so it has no effect |
| `type-implied-by-const-or-enum` | `type` that allows the `const` value or every value in `enum`, so it has no effect. Turn it off if your tools need `type` |
| `const-or-enum-value-for-disallowed-type` | A `const` value or a value in `enum` that `type` doesn't allow, so it's never valid |
| `required-property-not-allowed` | A property in `required` that `properties`, `patternProperties`, or `additionalProperties` doesn't allow, so no object is valid |
| `required-property-not-defined` | A property in `required` that no schema applying to the same object defines in `properties` or `patternProperties`, including schemas it's combined with by `allOf`, `anyOf`, `$ref`, and so on |
| `keyword-without-type` | A keyword or known format for one type of value, like `properties`, `minimum`, or the `date` format, where no `type`, `const`, or `enum` says what type the value is, so values of other types are valid |
| `property-names-type` | `type` in a `propertyNames` schema, which has no effect if it allows strings, because property names are always strings, and otherwise rejects every property name |
| `read-only-and-write-only` | `readOnly` and `writeOnly` both `true` in the same schema |
| `min-max-contains-without-contains` | `minContains` or `maxContains` without `contains` |
| `min-contains-zero-without-max-contains` | `minContains: 0` next to `contains` without `maxContains`, so `contains` never fails |
| `keyword-with-default-value` | A keyword that's the same as leaving it out, like `additionalProperties: true`, `properties: {}`, `minLength: 0`, or `uniqueItems: false` |
| `non-canonical-dialect-uri` | A `$schema` with a fragment that isn't empty, that isn't normalized, or that doesn't match its official dialect's URI, like draft-07 without `#`, which other implementations may not recognize |
| `invalid-dialect-uri` | A v1 `$schema` with a fragment or that isn't normalized, which v1 doesn't allow (an error) |
| `relative-root-id` | A relative `$id` on the root schema, like `/user`, so the schema's identifier depends on where it was retrieved from |
| `implicit-dialect` | A root schema without `$schema` whose dialect came from a media type parameter or the default dialect, so other tools may not know it |
| `reference-without-target` | A `$ref` that doesn't find a schema, such as a file that doesn't exist or a JSON Pointer that doesn't point to anything |

These rules aren't in the recommended preset, because they're matters of style
or they're expensive to run.
Turn them on with a severity, like `["hjlint/rules/mergeable-all-of-schema", ["warn"]]`.

| Rule | Reports |
| --- | --- |
| `mergeable-all-of-schema` | A schema in `allOf` whose keywords can be moved into the schema `allOf` is in without changing what's valid |
| `assertion-implied-by-const-or-enum` | An assertion next to `const` or `enum`, like `minLength` or `maximum`, that allows every value, so it has no effect (expensive) |
| `const-or-enum-value-rejected` | A `const` value or a value in `enum` that an assertion next to it, like `minLength` or `multipleOf`, rejects, so it's never valid (expensive) |
| `invalid-default-or-example` | A `default` value or a value in `examples` that isn't valid against the schema it's in, or against a schema that applies it, like one with `allOf` (expensive) |

A `$comment` that starts with `jsonschema-lint-disable` turns rules off for the
schema it's in and its subschemas, and `jsonschema-lint-enable` turns them back
on. Name the rules after it, or name none for every rule. The innermost schema
with a directive for a rule decides. It works in every dialect, including
draft-04 and draft-06, which don't have `$comment`. Schema problems can't be
turned off.

```json
{
  "$schema": "https://json-schema.org/v1",
  "$comment": "jsonschema-lint-disable then-else-without-if",
  "then": true,
  "properties": {
    "foo": { "$comment": "jsonschema-lint-enable then-else-without-if", "then": true }
  }
}
```

A directive that names a rule that isn't configured is a warning
(`unknown-rule`), and so is a misspelled directive (`unknown-directive`).

### Serializing compiled schemas

A compiled schema is JSON, so it can be cached and restored without retrieving
or compiling anything. The same keywords must have been added.

```javascript
const compiled = validator.serialize();
const restored = jsonSchema.restoreValidator(compiled);
```

## Using unified

Schemas and JSON files can be processed in [unified](https://unifiedjs.com/)
pipelines, with the JSON parser from `@hyperjump/browser/json`. It's how the
[`hjlint`](https://github.com/hyperjump-io/hjlint) CLI works.

### Reporting errors

`toVFileMessage` converts an error to a
[`VFileMessage`](https://github.com/vfile/vfile-message) with the message from
`outputErrorMessage`, to report it with unified tooling.

```javascript
import { toVFileMessage } from "@hyperjump/json-schema";

String(toVFileMessage(result.errors[0]));
// "1:27-1:29: Fails the constraint at 'https://example.com/person#/properties/age/minimum'"
```

### Linting in a pipeline

`jsonSchemaResolve` turns a JSON AST into a schema AST, and reports schema
problems. Lint rules are unified plugins that run after it.

```js
import { unified } from "unified";
import { rejsonParse, rejsonStringify } from "@hyperjump/browser/json";
import { jsonSchemaResolve } from "@hyperjump/json-schema";
import recommended from "@hyperjump/json-schema/lint/recommended";

const file = await unified()
  .use(rejsonParse, { accept: "recovered" })
  .use(jsonSchemaResolve, { session: jsonSchema.session() })
  .use(recommended)
  .use(rejsonStringify)
  .process(schemaText);
file.messages; // Lint messages and schema problems, with positions
```

### Validating JSON files

`jsonSchemaValidate` is a unified plugin that validates a JSON AST against a
compiled schema, so you decide where schemas come from.

```js
import { unified } from "unified";
import { rejsonParse, rejsonStringify } from "@hyperjump/browser/json";
import { jsonSchemaValidate } from "@hyperjump/json-schema";

const validator = await jsonSchema.compile("https://example.com/person");
const file = await unified()
  .use(rejsonParse, { accept: "recovered" })
  .use(jsonSchemaValidate, { validator })
  .use(rejsonStringify)
  .process(json);
file.messages; // Syntax errors and validation errors, with positions
```

## Extending

The `.d.ts` files in `src/` are hand-written and have JSDoc for every part of
the API. Run `npm run docs` to generate the API docs.

### Custom keywords

A keyword is a plain object identified by a URI. Add it with `addKeyword`, then
give it a name in a dialect. In v1, that's `extendDialect`.

```javascript
import { v1DialectUri } from "@hyperjump/json-schema/v1";

jsonSchema.addKeyword({
  uri: "https://example.com/keyword/even",
  shape: "data", // Where the keyword's value contains schemas
  check(valueNode, { message }) { // Reports problems with the keyword's value
    if (valueNode.jsonType !== "boolean") {
      message("Expected a boolean");
    }
  },
  // What the keyword means, as a kernel expression
  lower: (even) => even ? { op: "multipleOf", divisor: 2 } : { op: "pass" }
});

jsonSchema.extendDialect(v1DialectUri, {
  keywords: { even: "https://example.com/keyword/even" }
});
```

A keyword says what it means by lowering its value to an expression of the
kernel, a small language of operations every keyword lowers to (see
`src/kernel/kernel.d.ts` and [KERNEL.md](KERNEL.md)). Evaluation, the
optimizer, and the output formats only work with expressions, so a keyword
that lowers works with all of them. `lower` gets the value parsed by its
shape: a schema is `{ op: "apply", schema: handle }`, already compiled. A
keyword without an effect, like `even: false`, lowers to `pass`. See the
built-in keywords in `src/keywords/`.

A keyword that reads another keyword in the same schema, like
`additionalProperties` reads `properties`, declares it in `siblings` by a name
of its choosing, and `lower` and `check` get its value by that name.

```javascript
siblings: { properties: "https://json-schema.org/keyword/properties" },
lower: (schema, { properties = [] }) => ({ // Undefined if it isn't there
  op: "eachProperty",
  select: { except: { names: properties.map(([name]) => name), patterns: [] } },
  of: schema
})
```

Lint rules that move keywords between schemas use `siblings` to know what
can't be separated.

### Custom formats

```javascript
jsonSchema.addFormat({
  uri: "https://example.com/format/hex",
  types: ["string"],
  validate: (value) => /^[0-9a-f]+$/i.test(value)
});

jsonSchema.extendDialect(v1DialectUri, {
  formats: { hex: "https://example.com/format/hex" }
});
```

`types` lists the types of value a format applies to. A value of any other
type is valid, and `validate` isn't called for it. Without `types`, a format
applies to every type. A format can't apply to only integers, because
`integer` isn't a type of JSON value. A format for integers applies to
numbers.

### Custom dialects

Use `addDialect` for a dialect whose meta-schema doesn't define it. A dialect
maps keyword names to keyword URIs and says what unknown keywords mean.

```javascript
jsonSchema.addDialect({
  uri: "https://example.com/dialect",
  keywords: {
    type: "https://json-schema.org/keyword/type",
    even: "https://example.com/keyword/even"
  },
  unknownKeywords: "error"
});
```

### Lint rules

A lint rule is a unified plugin made with `lintRule` from
`@hyperjump/json-schema/lint`. It's
[`unified-lint-rule`](https://github.com/remarkjs/remark-lint/tree/main/packages/unified-lint-rule)'s
`lintRule`, and it also applies `$comment` directives to the rule's messages.
A rule runs on a schema AST, after every schema and keyword has been
identified. Find keywords by keyword URI, not by name, so the rule works in
every dialect with the keyword. The same module has utilities to find schemas
and keywords.

```javascript
import { lintRule, siblingKeyword, visitKeywords } from "@hyperjump/json-schema/lint";

export default lintRule({ origin: "jsonschema-lint-example:min-without-max" }, (tree, file) => {
  visitKeywords(tree, "https://json-schema.org/keyword/minimum", (keywordNode, schemaNode) => {
    if (siblingKeyword(schemaNode, "https://json-schema.org/keyword/maximum") === undefined) {
      file.message("'minimum' without 'maximum'", { place: keywordNode.position });
    }
  });
});
```

A rule that needs another schema, such as the target of a reference, uses
`findSchema` with the session the schema was resolved in
(`file.data.jsonSchemaSession`), so it only sees what your application's
registries and `allowRetrieval` allow. Pass the tree as `document`, so
references into the schema being linted find what's in it. It says whether
the schema is `found`, `missing`, or `unknown`. Report `missing` only.
`unknown` means it can't be told, such as for a URL `allowRetrieval`
refuses. `visitReferences` finds every `$ref` in every dialect, with the URI
it refers to.

```javascript
import { findSchema, visitReferences } from "@hyperjump/json-schema/lint";

const references = [];
visitReferences(tree, (uri, node) => references.push([uri, node]));
for (const [uri, node] of references) {
  const result = await findSchema(file.data.jsonSchemaSession, uri, { document: tree });
  if (result.status === "missing") {
    file.message(result.reason.message, { place: node.position });
  }
}
```

`schemaGroup` finds every schema that can apply to the same value as a
schema: the ones connected to it by keywords like `allOf`, `anyOf`, and
`if`, and by references, in either direction. A rule uses it to look past
the schema a keyword is in, such as to find `properties` next to the
`anyOf` a `required` is in. Its `links` say how they're connected, because
schemas in an `anyOf` can apply without all having to pass. `open` means
a schema in it could be referenced from another document, and `unknown`
means a reference couldn't be followed.

```javascript
const group = await schemaGroup(file.data.jsonSchemaSession, tree, schemaNode);
```

`formatTypes` says which types of value a `format` keyword's format applies
to, from the format's definition, or undefined if it could apply to any.

A package named `hyperjump-<name>` can be used in `hjlint`'s `.hyperjumprc`
as `<name>`. See `src/lint/` for the built-in rules.

### Evaluation plugins

Plugins observe an evaluation. They have `beforeSchema`, `afterSchema`,
`beforeKeyword`, `afterKeyword`, and `annotation` hooks. With any plugin, the
instance is evaluated once and nothing stops early, so it's slower.

What plugins see can depend on optimizations, but it's never wrong. A schema
that always passes, like `{}`, might not be evaluated as a schema of its own,
and a keyword that only annotates is left out for plugins without an
`annotation` hook.

`annotation` gets every annotation, even from schemas that fail, so a tool
like a language server can show a `description` in an invalid document.

```javascript
const descriptions = new Map();
validator.validateJson(json, {
  plugins: [{
    annotation(keyword, at, value) {
      if (keyword.keywordUri === "https://json-schema.org/keyword/description") {
        descriptions.set(at.instanceLocation, value);
      }
    }
  }]
});
```

```javascript
const keywords = new Set();
validator.validate(instance, {
  plugins: [{
    afterKeyword(keyword) {
      keywords.add(keyword.absoluteKeywordLocation);
    }
  }]
});
```

### Sessions

A session retrieves, browses, and compiles schemas. Everything it resolves
belongs to it, and it goes away with the session. `compile` creates a session
for each compilation. Create one yourself to browse schemas with
`@hyperjump/browser`'s API or to compile several schemas with the same
documents.

```javascript
const session = jsonSchema.session({ registries: [registry] });
const node = await session.get("https://example.com/person#/properties/name");
const validator = await session.compile("https://example.com/person");
```

## Contributing

`@hyperjump/browser` and `@hyperjump/uri` are linked from sibling directories
(`../browser` on its `v2` branch and `../uri`).

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
