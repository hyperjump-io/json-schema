# The kernel

The specification of the kernel, implemented in `src/kernel/`. How it's
implemented is in "Compile and evaluate" in [DESIGN.md](DESIGN.md), and its
measurements are in [BENCHMARKS.md](BENCHMARKS.md).

The kernel is a small language that every keyword lowers to. A keyword says
what it means as kernel expressions, and the kernel knows what every
expression means. The optimizer, the linter, and the output formats only work
with kernel expressions, so they support any keyword that lowers to them,
including user-defined ones, without knowing its URI.

It replaced `compile` and `evaluate` in the keyword interface. Before the
kernel, a keyword compiled to an opaque JSON value and evaluated through an
opaque closure, so everything that needed to know what a keyword means had
a table of keyword URIs: the passes (`static-unevaluated.js`), lint
(`keywordType`, `assertionUris`, `contradictory-limits`' pairs), and the
output formats (`if` and `conditional` in `output/utilities.js`).

Two prototypes came first (BENCHMARKS.md, "Kernel prototype" and "Kernel
prototype from the schema AST"). The implementation was checked against
the code before it on the real-world corpora and the test suites: the same
results, annotations, and output, except where this specification changes
BASIC, and the same hook calls without optimizations (BENCHMARKS.md, "The
kernel in `src/`").

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
  as they did before the kernel.
- **Values that couldn't be parsed** (`json-missing` and `json-invalid`
  nodes when evaluating JSON text) pass every schema. A property whose value
  couldn't be parsed is still present for `hasProperty`.
- **Explains its failure.** An operation explains its failure if it fails
  only when a subexpression fails, and their failures say why. The BASIC
  output format reports only the subexpressions' errors for those. This
  replaced `simpleApplicator`. It's what `simpleApplicator` said, except
  for `conditional`, for `dependencies` when every dependency is a schema,
  and for `anyOf` and `oneOf` of one schema, which explain their failures,
  so BASIC reports less.

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
  its result and its parent's state. The calls nest: everything between a
  group's `beforeKeyword` and `afterKeyword` is that group's. Output
  formats depend on it. BASIC's state for a keyword is where its errors
  start in one list, and it cuts the list back there when the keyword
  passes, so two groups' subschemas can't be evaluated interleaved. Within
  a group, the order of its subschemas isn't guaranteed, and output formats
  don't sort their errors.
- **`KeywordInfo`** has the group's `expression`, and what plugins need
  from it, computed once: `explainsFailure`, and `conditions`, the schemas
  its `cases` apply as conditions.
- **Sources** are the siblings a keyword read (`minContains` and
  `maxContains` for `contains`), so lint messages and tools can point at
  every keyword an expression came from. They're in the order the keyword
  declares its siblings, which is how a lint rule tells which one set a
  limit. They don't say which field of an operation each one set; nothing
  has needed more yet.
- **Order.** A group whose expression has an `unevaluated` selector is
  evaluated after the groups that don't, in document order otherwise. This
  replaced `reads: ["evaluated"]` and the ordering in `compile.js`.
- A schema is referred to by its handle (its canonical URI), so schemas can
  refer to each other and to themselves.
- **Versioning.** A serialized compiled schema has `kernel: 1`, the version
  of the kernel its expressions are in. `restoreValidator` rejects any other
  version. The version goes up when an operation's meaning changes.
- **What's read.** The kernel's `reads` lists the schemas with a keyword
  group that reads marks (`evaluated`) or the dynamic scope
  (`dynamicScope`), so evaluators and the optimizer know what to track
  without reading every expression. It's derived from the expressions, so
  `restoreValidator` works it out again, and adding it didn't change the
  version.

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
| `{ op: "typeSwitch", cases: { [type: JsonTypeName]?: Expression }, otherwise: Expression }` | everything | the branch for the instance's type passes | the branch's that applied |
| `{ op: "propertySwitch", name: string, cases: [Scalar, Expression][], other: Expression, absent: Expression, unparsed: Expression }` | object | see below | the branch's that applied |
| `{ op: "keySwitch", cases: [string, Expression][], none: Expression, unparsed: Expression }` | object | see below | the branch's that applied |
| `{ op: "apply", schema: Handle }` | everything | the schema passes | the schema's |
| `{ op: "dynamicApply", anchor: string, fallback: Handle \| null }` | everything | see below | the applied schema's |

- `apply` and `dynamicApply` explain their failures. `all` does if every
  one of its expressions does (`required` lowers to an `all` that doesn't),
  and `cases`, `typeSwitch`, `propertySwitch`, and `keySwitch` do if every
  branch does.
  `any` and `one` of one expression do, because "none passed" is then just
  "it failed", so `any` of one can be the one in normal form.
- **`typeSwitch`** applies the branch for the instance's JSON type (an
  integer is a `number`), or `otherwise` for a type it has no branch for.
  **`propertySwitch`** applies, to an object, the branch for the value of
  its property `name`: the case whose value equals it (`1` equals `1.0`),
  `other` if none does, `absent` if the object doesn't have the property,
  or `unparsed` if its value couldn't be parsed. Values are scalars, so an
  object or array value is `other`. If two cases have the same value, the
  first applies. **`keySwitch`** applies, to an object, the branch of the
  first case whose property it has with a value that was parsed, `none` if
  it has none of the properties, or `unparsed` if the ones it has all have
  values that couldn't be parsed.
  The switches are `cases` that an evaluator can look up instead of
  testing each condition, so they aren't lowered from keywords: the
  optimizer makes them (see "Optimizer"). `typeSwitch` passes an instance
  that couldn't be parsed, as every schema does. A property's value that
  couldn't be parsed would equal every value and pass every schema, so it
  gets a branch of its own: the optimizer makes it what the switch
  replaced, so the result is the same as before, errors included.
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
  as `format` did before the kernel. It's the one exception to "applies to".

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
  `itemPattern` built in `compile` before the kernel.

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
plugins, it does nothing, so the optimizer leaves it out. That replaced the
hand-written list of keywords that always pass.

### Escape hatches

| Operation | Applies to | Passes when |
| --- | --- | --- |
| `{ op: "predicate", keyword: string, value: Json, types: TypeName[] }` | `types` | the evaluator the keyword's `evaluate` built returns true |
| `{ op: "opaque", keyword: string, value: Json, schemas: Expression[], explainsFailure?: boolean, reads?: EvaluationState[] }` | everything | the evaluator the keyword's `evaluate` built returns true |

The keyword's `evaluate(value, context)` is called once for each operation
when an evaluator is built, and returns `(instance) => boolean`, so work
that only depends on the value is done once, as it is for the kernel's
other operations. The context's `op` says which one it's for.

- **`predicate`** is a check that isn't one of the kernel's operations. Its
  context has the `InstanceOps` to read the instance with, so an AST node is
  never converted. The kernel does the type check, so the evaluator only
  gets instances of `types`. It applies no schemas and marks nothing, so
  passes can see past it, and lint knows the types it applies to, but not
  what it checks.
- **`opaque`** is an applicator that isn't. What it applies is `schemas`,
  its subexpressions (usually `apply`), and `value` is only data, so nothing
  in the data is mistaken for a schema. The kernel knows what the keyword
  applies, but nothing else. The context has the evaluators of `schemas`,
  in order, each evaluating on the same instance or, given a segment, on a
  child; `markEvaluated`; `annotate`, when annotations can be seen;
  `exhaustive`, when it can't stop early; and `evaluated()` and
  `dynamicAnchor(name)` when it `reads` them. They read the evaluation in
  progress, so they only work while the evaluator runs. What's applied on
  the same instance marks for the keyword only if it passes, and what the
  keyword marks is kept only if it passes. `schemas` are in the normal
  form, but other passes treat the operation as a barrier: nothing is folded
  inside it, and `static-unevaluated` doesn't know what it marks.

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
- Limits that always pass are dropped: a count's `min: 0`, and
  `exclusiveMin` or `exclusiveMax` that's `false` or has no limit to go
  with. `range`, `stringLength`, `itemCount`, or `propertyCount` without
  limits is `pass`. A keyword then has the same expression with its
  default value as without it. `contains` with `min: 0` stays, because it
  marks what passes.
- A rule has to keep what the expression applies to. `range` with equal,
  inclusive limits isn't `equals`, because `range` passes every string and
  `equals` doesn't, so it stays a `range`.

## Optimizer

The optimizer rewrites expressions for evaluation. Without plugins,
anything that keeps the result and the marks is allowed, like inlining
`apply` or `not` of `not`. What's implemented is merging a schema's
property operations into one loop, resolving `unevaluated` selectors that
don't depend on the instance, folding schemas that always pass,
evaluating only the expressions of an `any` or `one` that can pass the
instance's type or tag (as a `typeSwitch`, `propertySwitch`, or
`keySwitch`), and leaving
out groups with no effect (DESIGN.md, "Optimizations").

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
  failure are only without plugins. Leaving out what can't pass the
  instance's type or tag isn't stopping early: it's decided before
  anything is evaluated, and plugins get the errors of what's evaluated.
  An `anyOf` or `oneOf` that fails has its own error and the errors of the
  schemas for the instance's type or tag, without the type or tag errors
  of every other schema. For a schema that applies itself through every
  branch, like a syntax tree, reporting those took time exponential in the
  instance's depth.

An optimization keeps this with a **source map**: each part of an
optimized expression says which keyword group it came from, so the
evaluator can make that group's hook calls with its result. It doesn't
have to reproduce the tree of hook calls from before the kernel. Without
optimizations, evaluation with plugins makes the same hook calls as
`specialize` did, which is how the implementation was checked. With
optimizations, it's checked by validity, annotations, and the optimized
hook calls being a subsequence of the unoptimized ones.

Hook calls nest (see "Schemas and keyword groups"), so across groups, only
the *matching* of a merged property loop can be merged with plugins. One
pass over the properties finds which groups' operations each one is for,
testing each pattern once and taking `additionalProperties` as "nothing
else matched". Each group then evaluates its matches between its own
hooks. The list of matches, by group, is the source map. Without plugins,
the evaluation is merged too.

Optimizations can depend on which hooks the plugins have. Without an
`annotation` hook (BASIC, DETAILED), `annotate` has no effect, so a group
that only annotates is left out, and a schema that's left with nothing is
`pass` where it's applied. That was worth more with BASIC than merging
(BENCHMARKS.md, "Kernel prototype from the schema AST").

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
  evaluate?: <I>(value: Json, context: EvaluateContext<I>) => (instance: I) => boolean;  // for `predicate` and `opaque` only
};

type Shape = "schema" | "unappliedSchema" | "reference" | "data" | { array: Shape } | { map: Shape } | Shape[];
```

- **`shape`** is the input type of `lower`. The kernel parses the value by
  its shape, reports values that don't fit, and gives `lower` the
  value with schemas replaced by expressions (`apply` of the handle they'll
  compile to) and references resolved. So `lower` never looks for schemas,
  and `shape` can't disagree with what the keyword does.
- **`"reference"`** is a URI of a schema, resolved against the base
  URI (`$ref`, 2020-12's `$dynamicRef`, `$recursiveRef`). It's what lint's
  `refUri` and bundling find references with, instead of keyword URIs. A reference's input is
  `{ uri: string; schema: Expression; handle: Handle; dynamicAnchors: Record<string, Handle> | undefined }`:
  `$dynamicRef` reads its fragment, and the dynamic anchors of the resource
  it resolved to are what `$dynamicRef` and `$recursiveRef` decide with.
  They're undefined when lint doesn't know them (see "Lowering for lint").
- **`"unappliedSchema"`** is a schema that the keyword doesn't apply
  (`contentSchema`). Resolving finds identifiers in it, and lint and the LS
  know it's a schema, but it isn't compiled, and `lower` gets its JSON.
- **`siblings`** are inputs too, by the names the record gives them, each
  parsed by its own keyword's shape. A sibling that's missing, or whose
  value didn't fit its shape or failed its check, is `undefined`. A keyword
  can only read the siblings it declares, and they're recorded as the
  group's `sources`.
- **`lower`** is synchronous and only reads its inputs and the context
  (`dialect`, `keywordName`, the `JsonSchema`). The kernel compiles: it
  compiles the schemas in the value and retrieves what references refer
  to before `lower` is called. It isn't called if the value didn't fit its
  shape. A keyword without `lower` has no keyword group, like `$id`. A keyword that has a group but no effect (`uniqueItems: false`, an
  unknown keyword that isn't an annotation) lowers to `pass`, so plugins see
  it pass, and the optimizer leaves it out without plugins.
- **Removed with the kernel:** `compile`, `simpleApplicator` (the
  operations say), `reads` (except on `opaque`), the keywords'
  `siblingKeyword`, `compileSchemaArray`, and `compileSchemaMap`
  utilities, and `siblings.test.js`.

## Every keyword

Every keyword in every dialect, and what it lowers to. `S` is a
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
| `title`, `description`, `default`, `examples` | | `annotate(value)` |
| `deprecated`, `readOnly`, `writeOnly` | | `annotate(value)` if it's `true`, otherwise `pass` (the specs say `false` is the same as leaving it out) |
| `contentEncoding`, `contentMediaType` | | `annotate(value, ["string"])` |
| `contentSchema` (shape `"unappliedSchema"`) | `contentMediaType` | `annotate(value, ["string"])` if `contentMediaType` is there, otherwise `pass` |
| `unknown` | | `annotate(value)` if the dialect's unknown keywords are annotations, otherwise `pass` |

Every keyword lowers to kernel operations. None needs `predicate` or
`opaque`.

## Lowering for lint

Lint runs without compiling, so it lowers each document itself, in the
normal form, without compiling or retrieving anything (`lowerForLint` in
`src/lint/lower.js`, which shares `lowerKeywords` with compiling):

- A subschema is `apply` of its location, and a reference is `apply` of
  the URI it resolves to. The dynamic anchors of a resource in the
  document are known. A dynamic reference into a document that isn't
  retrieved can't be decided, so lint lowers it to `dynamicApply`, which
  can only overstate which schemas might apply.
- A keyword whose value can't be lowered, like one that doesn't fit its
  shape in a broken document or one its keyword's `check` rejects
  (`"maximum": "x"`, because shape `"data"` fits anything), has no group,
  and such a sibling is left out. Lint reports the value.
- Every keyword's value is parsed by its shape, including keywords without
  `lower`, so the references in `definitions` are found too.
- Each group keeps its keyword's node and its sources' nodes, for where
  messages go.
- **Where each operation came from.** A keyword is lowered again without
  each sibling it read that's in the schema, and the expressions are
  compared. A field that's different without a sibling came from the
  sibling (draft-04's `exclusiveMaximum` for `range`'s `exclusiveMax`,
  `minContains` for `contains`' `min`). An operation that isn't there
  without it came from the keyword and the sibling (`if` and `then` for
  the `apply` of `then`'s schema), and so did everything if the keyword
  can't be lowered without it. The rest came from the keyword. A sibling
  with its default value lowers the same as without it, so nothing came
  from it. Rules ask with `cameFrom(operation, field?)`, so they don't
  depend on the order a keyword declares its siblings.

What lint knows from the expressions (`src/lint/analysis.js`: `appliesTo`,
`keywordAppliesTo`, `canPass`, `assertsOnItsOwn`):

- **The types a keyword applies to** are the types on which it can fail,
  mark, or annotate. A `cases` only applies where its condition can pass,
  which is why conditions say their type. A keyword with no effect in its
  schema (`uniqueItems: false`, `properties: {}`, an unknown keyword that
  isn't an annotation) applies to nothing. A sibling applies to what the
  keywords that read it apply to (draft-04's `exclusiveMaximum`). This
  replaced `keywordType`.
- **Whether a keyword asserts on its own**: it has an operation that can
  fail without a schema, and applies none. This replaced
  `const-or-enum-assertions`' list.
- **References** are the inputs of the `"reference"` shape and the schemas
  that are references. This replaced `visitReferences`' keyword URI.

In the prototype, these agreed with the tables they replaced on every
keyword in the corpora and the test suites, except where the kernel knows
more (BENCHMARKS.md, "Lowering for lint"). `contradictory-limits` reads
`range`, `stringLength`, `itemCount`, `propertyCount`, `contains`, and
`hasProperty`, without naming a keyword. It also finds v1's
`requireAllExcept` with too small a `maxProperties`, which the rule before
the kernel missed. A rule about a particular keyword's syntax
(`then-else-without-if`) still names it.

## Evaluating for lint

Lint evaluates the lowered expressions on values in the document, like a
`default` or the values of an `enum`, without compiling
(`evaluatorForLint` in `src/lint/evaluate.js`). A result is pass, fail, or
unknown, so a rule reports only what's sure.

- Before evaluating, every schema the document's expressions apply is
  found: a subschema by its location, and a reference with `findSchema`,
  lowering the document it's in. Evaluating is then synchronous.
- **Unknown** is a reference that can't be followed, a schema whose dialect
  isn't known, `dynamicApply` (the dynamic scope depends on what applies
  the schema), `opaque`, and a schema applied to an instance it's already
  being evaluated on. `predicate` is evaluated with the keyword's
  `evaluate`.
- The logic is Kleene's: `all` fails if one fails, and is unknown if one is
  unknown and none fails; `any` and `one` likewise; `not` of unknown is
  unknown. A `cases` condition that's unknown gives the branch's result if
  it's the same as the rest's, and unknown otherwise. `contains` and
  `itemSequence` count what might pass as well as what does.
- **Marks** are sure (they're there if the schema passes) or might be. What
  an unknown subexpression marks, and what an unknown schema might mark
  (anything), might be. An `unevaluated` selector skips what's sure to be
  marked, and a property or item that might be marked can only make it
  unknown, not fail.
- A result also says whether it might annotate the value, and whether it
  marks part of it, which are effects for
  `keyword-implied-by-const-or-enum`.
- A keyword that wasn't lowered isn't evaluated, so it passes, and a value
  that couldn't be parsed passes every schema, as when validating.

## Open questions

None yet.
