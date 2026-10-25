# Every keyword

Every keyword in every dialect, and what it lowers to. `S` is a
schema's expression (`apply`), and `[…]` is `all` of what's in it.

## No keyword group

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

## Applicators to the same instance

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

## Applicators to properties and items

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

## Assertions

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

## Annotations

| Keyword | Siblings | Lowers to |
| --- | --- | --- |
| `title`, `description`, `default`, `examples` | | `annotate(value)` |
| `deprecated`, `readOnly`, `writeOnly` | | `annotate(value)` if it's `true`, otherwise `pass` (the specs say `false` is the same as leaving it out) |
| `contentEncoding`, `contentMediaType` | | `annotate(value, ["string"])` |
| `contentSchema` (shape `"unappliedSchema"`) | `contentMediaType` | `annotate(value, ["string"])` if `contentMediaType` is there, otherwise `pass` |
| `unknown` | | `annotate(value)` if the dialect's unknown keywords are annotations, otherwise `pass` |

Every keyword lowers to kernel operations. None needs `predicate` or
`opaque`.
