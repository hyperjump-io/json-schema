# The kernel

A draft specification, started 2026-10-23. Nothing here is implemented yet.
The plan is in "Plan" in [DESIGN.md](DESIGN.md).

The kernel is a small language that every keyword lowers to. A keyword says
what it means as kernel expressions, and the kernel knows what every
expression means. The optimizer, the linter, and the output formats only work
with kernel expressions, so they support any keyword that lowers to them,
including user-defined ones, without knowing its URI.

It replaces `compile` and `evaluate` in the keyword interface. Today a
keyword compiles to an opaque JSON value and evaluates through an opaque
closure, so everything that needs to know what a keyword means has a table
of keyword URIs: the passes (`static-unevaluated.js`), lint
(`keywordTypes`, `assertionUris`, `contradictory-limits`' pairs), and the
output formats (`if` and `conditional` in `output/utilities.js`).

A prototype (`benchmark/claude/core/`, not committed) lowered today's
compiled values to an earlier, coarser version of these operations. Its
fast closures agreed with `validate` on every instance of the real-world
corpora and the test suites. They were 1.0–3.1 times faster, and merging a
schema's property loops is what made real schemas faster. Evaluating them
with plugins gave the same hook calls as `specialize` (about 4 million,
compared one by one) and the same BASIC and DETAILED output, at the same
speed or faster.

## Principles

- **An operation states one fact about the instance, not a step of an
  algorithm.** "Every property matching `^x-` is valid against S" is a
  fact. "Loop over the properties" isn't. Iteration and branching are part
  of what an operation means, never operations of their own. Lint and the
  passes depend on knowing what an operation means.
- **Small operations.** A keyword that says several things lowers to
  several operations (`required: ["a", "b"]` is two `hasProperty`). That
  gives the optimizer and lint more to work with. Evaluating each operation
  on its own would be slow, so merging them (like a schema's property
  operations into one loop over the properties) is the optimizer's job, and
  it isn't optional.
- **One meaning, one form.** Where two forms say the same thing, one is the
  normal form, and a pass rewrites the other to it before anything else
  (see "Normal form").
- **The kernel knows meaning, keywords declare syntax.** Where a keyword's
  value has schemas (`shape`) and which siblings it reads (`siblings`) are
  about the document. They're needed before lowering, on documents that may
  be broken, by tools that never lower. So they stay declared, and they're
  what `lower` gets as input. Everything about meaning comes from the
  expressions.
- **Expressions are JSON**, so a compiled schema can still be serialized.
- **Escape hatches are explicit.** A keyword that can't be said with the
  kernel's operations uses `predicate` (a check) or `opaque` (an
  applicator). Those are supported, but the optimizer and lint can see less
  of them.

## Evaluation model

An expression is evaluated on an instance value. It has a result (valid or
not), the property names or item indexes it marks as evaluated, and the
annotations it makes.

- **Types.** An instance is `null`, `boolean`, `number`, `string`, `array`,
  or `object`. `integer` is a number with no fractional part, including one
  written like `1.0`, and it's only something `typeIs` tests for.
- **Applies to.** Every operation has the types it applies to. On an
  instance of any other type, it passes without marking or annotating
  anything. That's how lint knows which types a keyword applies to, and it
  doesn't need a table.
- **Subexpressions** are evaluated on the same instance, or on a child of
  it: a property's value, an item, or a property name. Each operation says
  which.
- **Marks.** An operation's marks are kept only if it passes. A
  subexpression's marks on the same instance are its parent's marks.
  Marks made on a child are about the child, so they never reach the
  parent. They're used by `unevaluated` selectors only. A marked property
  name and a marked item index can't be confused, because an instance can't
  be both an object and an array.
- **Annotations** are kept only if the expression that made them and every
  expression it was evaluated through pass. Plugins see every annotation,
  as they do today.
- **Values that couldn't be parsed** (`json-missing` and `json-invalid`
  nodes when evaluating JSON text) pass every schema. A property whose value
  couldn't be parsed is still present for `hasProperty`.
- **Explains its failure.** An operation explains its failure if it fails
  only when a subexpression fails, and their failures say why. The BASIC
  output format reports only the subexpressions' errors for those. This
  replaces `simpleApplicator`. It's what `simpleApplicator` says today,
  except for `conditional` and for `dependencies` when every dependency is
  a schema, which now explain their failures, so BASIC reports less.

## Schemas and keyword groups

A compiled schema is a boolean, or the expressions of its keywords:

```ts
type CompiledSchema = boolean | { resource: string; keywords: KeywordGroup[] };

type KeywordGroup = {
  keywordUri: string;
  location: string;       // the keyword's absolute keyword location
  sources: string[];      // the locations of the siblings it read
  expression: Expression;
};
```

- A schema passes if every keyword group passes. Without plugins or
  annotations, evaluation stops at the first failure.
- **Keyword groups are what plugins and errors see.** An error is reported
  for a keyword, never for an operation inside it. With plugins, the
  optimizer can merge across groups only if it keeps a source map (see
  "Optimizer").
- **Plugins** see a tree of hook calls: each schema and keyword group with
  its result and its parent's state. The order of siblings isn't
  guaranteed, so a merged loop can call the hooks of `properties`' and
  `patternProperties`' schemas for one property before the next property's.
  Output formats don't sort their errors.
- **Sources** are the siblings a keyword read (`minContains` and
  `maxContains` for `contains`), so lint messages and tools can point at
  every keyword an expression came from.
- **Order.** A group whose expression has an `unevaluated` selector is
  evaluated after the groups that don't, in document order otherwise. This
  replaces `reads: ["evaluated"]` and the ordering in `compile.js`.
- A schema is referred to by its handle (its canonical URI), so schemas can
  refer to each other and to themselves.
- **Versioning.** A serialized compiled schema has `kernel: 1`, the version
  of the kernel its expressions are in. `restoreValidator` rejects any other
  version. The version goes up when an operation's meaning changes.

## Operations

`Expression` is any of these. Fields that hold expressions can hold any
expression, nested, so a condition like `hasProperty("a")` doesn't have to
be a schema of its own. A schema is used through `apply`.

Unless it says otherwise, an operation marks nothing, annotates nothing, and
doesn't explain its failure.

### Logic and schemas

| Operation | Applies to | Passes when | Marks |
| --- | --- | --- | --- |
| `{ op: "pass" }` | – | always | – |
| `{ op: "fail" }` | everything | never | – |
| `{ op: "all", of: Expression[] }` | everything | every one passes | every one's |
| `{ op: "any", of: Expression[] }` | everything | at least one passes | the passing ones' |
| `{ op: "one", of: Expression[] }` | everything | exactly one passes | the passing one's |
| `{ op: "not", of: Expression }` | everything | it fails | – |
| `{ op: "cases", cases: [Expression, Expression \| null][], otherwise: Expression \| null }` | everything | see below | the condition's and branch's that applied |
| `{ op: "apply", schema: Handle }` | everything | the schema passes | the schema's |
| `{ op: "dynamicApply", anchor: string, fallback: Handle \| null }` | everything | see below | the applied schema's |

- `apply` and `dynamicApply` explain their failures. `all` does if every
  one of its expressions does (`required` lowers to an `all` that doesn't),
  and `cases` does if every branch does. `any` and `one` of one expression
  do, because "none passed" is then just "it failed", so `any` of one can
  be the one in normal form.
- **`cases`**: the first case whose condition passes applies its branch
  (`null` passes). If no condition passes, `otherwise` applies (`null`
  passes). A condition that fails is a condition, not an error: the output
  formats drop its errors, which they find from the operation instead of
  the `if` and `conditional` keyword URIs. `if`/`then`/`else`, v1's
  `conditional`, `dependentSchemas`, `dependentRequired`, and
  `propertyDependencies` all lower to it.
- **A condition has to say its type.** An operation passes instances it
  doesn't apply to, so `hasProperty(name)` alone is a condition that passes
  every string and array, and `cases([[hasProperty(name), S]], null)` would
  apply `S` to them. A condition about properties is
  `all(typeIs(["object"]), hasProperty(name))`, written `isObject` below.
  User-defined keywords have to do the same.
- **`any`, `one`**: without plugins or annotations, `any` can stop at the
  first that passes unless something reads what's evaluated, and `one` can
  stop at the second.
- **`dynamicApply`** applies the outermost schema in the dynamic scope with
  the dynamic anchor `anchor`. If there isn't one, it applies `fallback`,
  and if that's `null`, it's an error (v1's `$dynamicRef` without an anchor
  in scope). It has no dialect rules. 2020-12's bookending and 2019-09's
  `$recursiveAnchor` decide whether a reference uses the dynamic scope at
  all, from the dynamic anchors of the resource it resolves to, which are
  known when lowering. So lowering decides: a reference that doesn't use
  the dynamic scope is a plain `apply`.

### Values of any type

| Operation | Applies to | Passes when |
| --- | --- | --- |
| `{ op: "typeIs", types: TypeName[] }` | everything | the instance is one of `types` (`integer` included) |
| `{ op: "equals", value: Json }` | everything | the instance equals `value` (`1` equals `1.0`) |
| `{ op: "oneOfValues", values: Json[] }` | everything | the instance equals one of `values` |

### Numbers

| Operation | Applies to | Passes when |
| --- | --- | --- |
| `{ op: "range", min?: number, max?: number, exclusiveMin?: boolean, exclusiveMax?: boolean }` | number | it's within the limits |
| `{ op: "multipleOf", divisor: number }` | number | it's a multiple, within floating point error |

### Strings

| Operation | Applies to | Passes when |
| --- | --- | --- |
| `{ op: "stringLength", min?: number, max?: number }` | string | its length in code points is within the limits |
| `{ op: "matches", pattern: string }` | string | the ECMA-262 pattern with the `u` flag matches |
| `{ op: "format", name: string, uri: string \| null, assert: boolean }` | the format's `types` (to assert) | see below |

- **`format`** annotates `name`. If `assert` is true, it also asserts the
  format `uri`. Lowering decides `assert` from the `JsonSchema`'s
  configuration, so a serialized expression means the same wherever it's
  restored, and restoring fails if an asserting format isn't registered. It
  asserts only on the types the format declares (`Format.types`), so lint
  gets them from the operation, but it annotates instances of every type,
  as `format` does today. It's the one exception to "applies to".

### Arrays

| Operation | Applies to | Passes when | Marks |
| --- | --- | --- | --- |
| `{ op: "itemCount", min?: number, max?: number }` | array | the number of items is within the limits | – |
| `{ op: "uniqueItems" }` | array | no two items are equal | – |
| `{ op: "item", index: number, of: Expression }` | array | there's no such item, or it passes | the index, if it passes |
| `{ op: "eachItem", from: number, of: Expression }` | array | every item from `from` on passes | each index it passes |
| `{ op: "eachItem", unevaluated: true, of: Expression }` | array | every item not marked yet passes | each index it passes |
| `{ op: "contains", of: Expression, min: number, max: number \| null }` | array | the number of items that pass is within the limits | each index that passes |
| `{ op: "itemSequence", pattern: ItemPattern }` | array | the items, in order, match the pattern | every index, if it passes |

- `item` and `eachItem` explain their failures. They evaluate items, which
  are children.
- **`itemSequence`** is v1's `itemPattern`. `ItemPattern` is a regular
  expression over item expressions: `{ item: Expression }`,
  `{ sequence: ItemPattern[] }`, `{ either: ItemPattern[] }`, and
  `{ repeat: ItemPattern, min: 0 | 1, max: 1 | null }` for `?`, `*`, and
  `+`. Lowering builds this tree, and the kernel builds the automaton
  `itemPattern` builds in `compile` today.

### Objects

| Operation | Applies to | Passes when | Marks |
| --- | --- | --- | --- |
| `{ op: "propertyCount", min?: number, max?: number }` | object | the number of properties is within the limits | – |
| `{ op: "hasProperty", name: string }` | object | it has the property | – |
| `{ op: "propertyEquals", name: string, value: Json }` | object | it has the property and its value equals `value` | – |
| `{ op: "property", name: string, of: Expression }` | object | it doesn't have the property, or its value passes | the name, if it passes |
| `{ op: "eachProperty", select: Selector, of: Expression }` | object | every selected property's value passes | each name it passes |
| `{ op: "eachPropertyName", of: Expression }` | object | every property name passes, as a string | – |

`Selector` is:

- `{ pattern: string }`: names the ECMA-262 pattern (`u` flag) matches
- `{ except: { names: string[]; patterns: string[] } }`: names that aren't
  listed and don't match any of the patterns
- `{ unevaluated: true }`: names not marked yet

- `property`, `eachProperty`, and `eachPropertyName` explain their
  failures. The first two evaluate property values, which are children.
  `eachPropertyName` evaluates names, which are children too.
- **`propertyEquals`** is separate from `property(name, equals(value))`
  because it doesn't mark the property. `propertyDependencies` uses it as a
  condition, and a condition that passes keeps its marks, so the other form
  would mark the property as evaluated, which `propertyDependencies`
  doesn't.

### Annotations

| Operation | Applies to | Passes when |
| --- | --- | --- |
| `{ op: "annotate", value: Json, types?: TypeName[] }` | `types`, or everything | always |

It annotates `value`, on instances of `types`. Without annotations or
plugins, it does nothing, so the optimizer leaves it out. That replaces the
hand-written list of keywords that always pass.

### Escape hatches

| Operation | Applies to | Passes when |
| --- | --- | --- |
| `{ op: "predicate", keyword: string, value: Json, types: TypeName[] }` | `types` | the keyword's `evaluate(value, instance, ops)` returns true |
| `{ op: "opaque", keyword: string, value: Json, explainsFailure?: boolean, reads?: EvaluationState[] }` | everything | the keyword's `evaluate(value, context)` returns true |

- **`predicate`** is a check that isn't one of the kernel's operations. Its
  `evaluate` gets the instance, only of `types`, and the `InstanceOps` to
  read it with, so an AST node is never converted. The kernel does the type
  check. It applies no schemas and marks nothing, so passes can see past
  it, and lint knows the types it applies to, but not what it checks.
- **`opaque`** is an applicator that isn't. `evaluate` gets today's
  `EvaluateContext` (`schema`, `markEvaluated`, `annotate`, `dynamicAnchor`,
  …). The kernel finds the schema placeholders in `value` and replaces them
  with handles, so it knows which schemas the keyword applies, but nothing
  else. Passes treat it as a barrier.

## Normal form

A pass rewrites expressions to their normal form before anything else, so
lint, the other passes, and evaluation with or without plugins only see one
form of each meaning. What may change, and what may not:

1. **A rewrite never changes** the result, the marks, or the annotations.
2. **A normal-form rule can change what's derived from expressions**, like
   whether a keyword explains its failure, and so what an output format
   reports. It always applies, so the output is still the same for every
   evaluation. Such a change is a change in the output, so it needs a new
   kernel version.
3. **Hook calls can depend on optimizations** (see "Optimizer"), but never
   be wrong.

The rules so far:

- `all` and `any` in themselves are flattened, and `all` of one is the one
- `any` of one is the one. Both explain their failures, so BASIC reports
  the same, without the `anyOf` error that only said its schema failed.
- `oneOfValues` of one value is `equals`
- `typeIs` with no types is `fail`
- `pass` in `all` is dropped, and `fail` in `any` is dropped
- A rule has to keep what the expression applies to. `range` with equal,
  inclusive limits isn't `equals`, because `range` passes every string and
  `equals` doesn't, so it stays a `range`.

## Optimizer

The optimizer rewrites expressions for evaluation: merging a schema's
property operations into one loop, inlining `apply`, `not` of `not`,
leaving out `annotate`, folding groups that always pass. Without plugins,
anything that keeps the result and the marks is allowed.

With plugins, what plugins see can depend on the optimizations: which
schemas are evaluated as schemas of their own, how DETAILED nests, the
order of siblings, how often something is evaluated. A coverage plugin
reports what was evaluated, which is true of that evaluation. What
plugins see can't be wrong, though:

- **Every hook call is about what it says.** Each keyword group a merged
  operation came from still gets its own `beforeKeyword` and
  `afterKeyword`, with its own result, so an error is never reported at a
  keyword that didn't fail. Conditions stay recognizable: BASIC drops a
  condition's errors when `afterSchema` says it's a condition of the
  keyword that applied it, so a condition can't be inlined in a way that
  loses that.
- **Nothing stops early** when a plugin needs every error. `any` stopping
  at the first that passes, `one` at the second, and a schema at its first
  failure are only without plugins, as today.

An optimization keeps this with a **source map**: each part of an
optimized expression says which keyword group it came from, so the
evaluator can make that group's hook calls with its result. It doesn't
have to reproduce today's tree of hook calls. Without optimizations,
evaluation with plugins makes the same hook calls as `specialize` today,
which is how the prototype is checked. With optimizations, it's checked by
validity, annotations, and every error being at a keyword that failed.

The source map isn't prototyped. With plugins, the hook calls may be most
of the cost, so the first thing to measure is a merged property loop with a
source map against BASIC today.

## The keyword interface

```ts
type Keyword = {
  uri: string;
  shape: Shape;
  siblings?: Record<string, string>;   // local name to keyword URI
  default?: Json;
  check?: (valueNode, context) => void;
  resolve?: (valueNode, context) => void;
  lower?: (value: LowerInput, siblings: Record<string, LowerInput | undefined>, context: LowerContext) => Expression;
  evaluate?: …;                         // for `predicate` and `opaque` only
};

type Shape = "schema" | "unappliedSchema" | "reference" | "data" | { array: Shape } | { map: Shape } | Shape[];
```

- **`shape`** is the input type of `lower`. The kernel parses the value by
  its shape, reports values that don't fit as today, and gives `lower` the
  value with schemas replaced by expressions (`apply` of the handle they'll
  compile to) and references resolved. So `lower` never looks for schemas,
  and `shape` can't disagree with what the keyword does.
- **`"reference"`** is new: a URI of a schema, resolved against the base
  URI (`$ref`, 2020-12's `$dynamicRef`, `$recursiveRef`). It's what lint's
  `refUri`, `schema-group.js`' list of dynamic references, and bundling find
  references with, instead of keyword URIs. A reference's input is
  `{ uri: string; schema: Expression; handle: Handle; dynamicAnchors: Record<string, Handle> }`:
  `$dynamicRef` reads its fragment, and the dynamic anchors of the resource
  it resolved to are what `$dynamicRef` and `$recursiveRef` decide with.
- **`"unappliedSchema"`** is new: a schema that the keyword doesn't apply
  (`contentSchema`). Resolving finds identifiers in it, and lint and the LS
  know it's a schema, but it isn't compiled, and `lower` gets its JSON.
- **`siblings`** are inputs too, by the names the record gives them, each
  parsed by its own keyword's shape. A sibling that's missing, or whose
  value didn't fit its shape or failed its check, is `undefined`. A keyword
  can only read the siblings it declares, and they're recorded as the
  group's `sources`. `siblings.test.js` isn't needed anymore.
- **`lower`** is synchronous and only reads its inputs and the context
  (`dialect`, `keywordName`, the `JsonSchema`). The kernel compiles: it
  retrieves what references refer to and replaces placeholders with
  handles. It isn't called if the value or a sibling it needs didn't fit
  its shape. A keyword without `lower` has no keyword group, like `$id`
  today. A keyword that has a group but no effect (`uniqueItems: false`, an
  unknown keyword that isn't an annotation) lowers to `pass`, so plugins see
  it pass, and the optimizer leaves it out without plugins.
- **Removed:** `compile`, `simpleApplicator` (the operations say),
  `reads` (except on `opaque`), and the `siblingKeyword`,
  `compileSchemaArray`, and `compileSchemaMap` utilities.

## Every keyword

Every keyword in every dialect today, and what it lowers to. `S` is a
schema's expression (`apply`), and `[…]` is `all` of what's in it.

### No keyword group

These identify schemas, hold definitions, or are read by a sibling. They
don't have `lower`.

| Keyword | Why |
| --- | --- |
| `id`, `draft-07/id`, `anchor`, `draft-2019-09/anchor`, `dynamicAnchor`, `draft-2019-09/recursiveAnchor` | identify schemas (`resolve`) |
| `schema`, `vocabulary`, `comment`, `definitions` | about the document |
| `draft-07/ref` | the schema is a reference node, which compiles to its target |
| `then`, `else` | read by `if` |
| `minContains`, `maxContains` | read by `contains` |
| `draft-04/exclusiveMinimum`, `draft-04/exclusiveMaximum` | read by draft-04's `minimum` and `maximum` |

### Applicators to the same instance

| Keyword | Shape | Siblings | Lowers to |
| --- | --- | --- | --- |
| `allOf` | `{ array: "schema" }` | | `all(S…)` |
| `anyOf` | `{ array: "schema" }` | | `any(S…)` |
| `oneOf` | `{ array: "schema" }` | | `one(S…)` |
| `not` | `"schema"` | | `not(S)` |
| `if` | `"schema"` | `then`, `else` | `cases([[S, then ?? null]], else ?? null)` |
| `conditional` | `{ array: ["schema", { array: "schema" }] }` | | `cases` of the pairs, with a last odd one as `otherwise` |
| `ref` | `"reference"` | | `S` |
| `dynamicRef` (v1) | `"data"` (an anchor name) | | `dynamicApply(name, null)` |
| `draft-2020-12/dynamicRef` | `"reference"` | | `dynamicApply(fragment, S)` if the fragment is a plain name that's a dynamic anchor of the resource it resolved to, otherwise `S` |
| `draft-2019-09/recursiveRef` | `"reference"` | | `dynamicApply("", S)` if the schema it resolved to has `$recursiveAnchor: true`, otherwise `S` |
| `dependentSchemas` | `{ map: "schema" }` | | `[cases([[[isObject, hasProperty(name)], S]], null)…]` |
| `propertyDependencies` | `{ map: { map: "schema" } }` | | `[cases([[[isObject, propertyEquals(name, value)], S]], null)…]` |
| `draft-07/dependencies`, `draft-04/dependencies` | `{ map: ["schema", { array: "data" }] }` | | `[cases([[[isObject, hasProperty(name)], S or [hasProperty(n)…]]], null)…]` |

### Applicators to properties and items

| Keyword | Shape | Siblings | Lowers to |
| --- | --- | --- | --- |
| `properties` | `{ map: "schema" }` | | `[property(name, S)…]` |
| `patternProperties` | `{ map: "schema" }` | | `[eachProperty({ pattern }, S)…]` |
| `additionalProperties` | `"schema"` | `properties`, `patternProperties` | `eachProperty({ except: { names, patterns } }, S)` |
| `unevaluatedProperties` | `"schema"` | | `eachProperty({ unevaluated: true }, S)` |
| `propertyNames` | `"schema"` | | `eachPropertyName(S)` |
| `prefixItems` | `{ array: "schema" }` | | `[item(index, S)…]` |
| `items` | `"schema"` | `prefixItems` | `eachItem({ from: prefixItems.length or 0 }, S)` |
| `draft-2019-09/items` | `["schema", { array: "schema" }]` | | an array is `[item(index, S)…]`, a schema is `eachItem({ from: 0 }, S)` |
| `draft-2019-09/additionalItems` | `"schema"` | `items` | `eachItem({ from: items.length }, S)` if `items` is an array, otherwise `pass` |
| `unevaluatedItems` | `"schema"` | | `eachItem({ unevaluated: true }, S)` |
| `contains` | `"schema"` | `minContains`, `maxContains` | `contains(S, minContains ?? 1, maxContains ?? null)` |
| `itemPattern` | its pattern grammar | | `itemSequence(pattern)` |

### Assertions

| Keyword | Siblings | Lowers to |
| --- | --- | --- |
| `type`, `draft-2020-12/type` | | `typeIs(types)` |
| `const` | | `equals(value)` |
| `enum`, `draft-04/enum` | | `oneOfValues(values)` |
| `minimum`, `maximum` | | `range({ min })`, `range({ max })` |
| `exclusiveMinimum`, `exclusiveMaximum` | | `range({ min, exclusiveMin: true })`, `range({ max, exclusiveMax: true })` |
| `draft-04/minimum`, `draft-04/maximum` | `exclusiveMinimum`, `exclusiveMaximum` (draft-04's) | `range({ min, exclusiveMin })`, `range({ max, exclusiveMax })` |
| `multipleOf` | | `multipleOf(divisor)` |
| `minLength`, `maxLength` | | `stringLength({ min })`, `stringLength({ max })` |
| `pattern` | | `matches(pattern)` |
| `format`, `draft-07/format` | | `format(name, uri, assert)`, `uri` being `null` and `assert` false for a format the dialect doesn't have (draft-07's) |
| `minItems`, `maxItems` | | `itemCount({ min })`, `itemCount({ max })` |
| `uniqueItems` | | `uniqueItems` if `true`, `pass` if `false` |
| `minProperties`, `maxProperties` | | `propertyCount({ min })`, `propertyCount({ max })` |
| `required`, `draft-04/required` | | `[hasProperty(name)…]` |
| `dependentRequired` | | `[cases([[[isObject, hasProperty(name)], [hasProperty(n)…]]], null)…]` |
| `requireAllExcept` | `properties` | `[hasProperty(name)…]` for the names in `properties` it doesn't list |

### Annotations

| Keyword | Siblings | Lowers to |
| --- | --- | --- |
| `title`, `description`, `default`, `examples`, `deprecated`, `readOnly`, `writeOnly` | | `annotate(value)` |
| `contentEncoding`, `contentMediaType` | | `annotate(value, ["string"])` |
| `contentSchema` (shape `"unappliedSchema"`) | `contentMediaType` | `annotate(value, ["string"])` if `contentMediaType` is there, otherwise `pass` |
| `unknown` | | `annotate(value)` if the dialect's unknown keywords are annotations, otherwise `pass` |

Every keyword lowers to kernel operations. None needs `predicate` or
`opaque`.

## Open questions

- **Lowering on the schema AST for lint.** Lint runs without compiling, so
  it would lower each schema itself, with schemas lowered but not compiled
  and references not retrieved. That isn't prototyped. A dynamic reference
  into a document that isn't retrieved can't be decided, so lint lowers it
  to `dynamicApply`, which can only overstate which schemas might apply.
- **The source map** (see "Optimizer") isn't prototyped, and whether
  merging across groups pays for itself with plugins isn't measured.
