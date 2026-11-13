# Identifiers

Identifiers are IRIs, checked, resolved, and normalized with
`@hyperjump/uri` v2, like browser's (see its
[Identifiers are IRIs](https://github.com/hyperjump-io/browser/blob/main/design/principles/identifiers-are-iris.md)).
v2's functions don't check what they're given or normalize what they
return, and its types say which a string is (`Iri`, `AbsoluteIri`,
`NormalizedIri`). Where a value comes from decides its type:

- A value from outside the library is a `string`, and it's checked once,
  where it comes in: the URIs an application gives the API (`compile`,
  `bundle`, `lint`, `getDialect`, registry options), the config's dialect
  and vocabulary URIs, `$id`, `$ref`, and `$schema` in a schema, and a
  restored kernel's URI.
- A value the library hands out is branded: a resource's `uri`, a node's
  `location` and `href`, and a `SchemaMessage`'s `uri`.

## Normalized where they're keys

An identifier is normalized where equivalent ones have to be the same,
because normalizing costs something and changes how it reads.

- Resources, dialects, vocabularies, and registry entries are kept by an
  `Id` (`src/identifiers.js`), an `AbsoluteIri & NormalizedIri`. `toId`
  makes one from a `string` from outside, and `resolveId` from a reference
  in a document, like `$id`'s, against a base. They do what v1's
  `toAbsoluteIri` and `resolveIri` did at those calls, which checked and
  normalized.
- A resource's `uri` is an `Id`, so a node's `location`, its resource's
  URI and a fragment `encodeIriFragment` leaves normalized, is normalized
  too. That's a cast in `resolve.js`, because it's true by construction.
- A `href` is normalized when it's resolved, so it's the same string as the
  `location` of the schema it finds. Lint and bundling compare it with
  locations and use it as a handle.
  - Leaving it as it's resolved, and normalizing where lint and bundling
    compare, was tried and rejected. Validating would save one
    normalization of each `href` for each document, out of the two or
    three it still gets when lowering follows it (browser's `getDocument`,
    and the session's embedded lookup). Lint needed eight places to
    normalize, which normalized the same `href` again and again, and a
    rule the types can't enforce, because lint's lookups also take kernel
    handles, which are `string`s.
  - Lint's tests with references that aren't normalized
    (`#/definitions/%61`, and the rule pages' examples linted again with
    `#` references written as `HTTPS://Example.com/schema.json#…`) came
    from that and stay, since lint has to handle equivalent references
    whichever layer normalizes them.
- `toRelativeIri` takes normalized identifiers. A compiled kernel's URIs
  are locations, which already are, so `kernel-uris.js` casts them rather
  than normalizing them again, and a bundle's files are relative to the
  main document's `Id`.

## Looking up a document

Browser's `getDocument` does every lookup, including the references `get`
follows, with the URL it parsed. Where a lookup meets `json-schema`'s
identifiers, the URL is converted to an `Id` (`urlToIri`, then `toId`):
a session's `fetch` converts the URL it's asked for, to look for it in
the registries, and a node's resource is found by the `Id` of the node's
location.

- Overriding `getDocument` to work out the `Id` before browser does was
  rejected. Browser parses the URI either way, so it was checked twice, and
  the override stood between the session and everything it found.

## `setBaseUri` takes a reference

A resolve hook gives `setBaseUri` the reference as it's written, and the
resolver resolves it against the base the schema is in, like
`setReference`. So `ResolveContext` has no `baseUri`.

- Only the `id` keywords read `baseUri`, to resolve before calling
  `setBaseUri`. A registry entry without a retrieval URI has no base, and
  v2 doesn't take `""` as one, so each keyword would have had to handle
  that. Now `resolveId` does, once, and reports a relative reference with
  no base.
- A value is checked once. The `id` keywords leave it to `setBaseUri` and
  read a fragment as it's written. Only draft-04 through draft-07's
  fragment-only `id`, which doesn't call `setBaseUri`, checks it itself. So
  a 2019-09 or later `$id` that's invalid and has a fragment is reported for
  the fragment. A value whose shape is a reference is checked once, in
  `#reference`, not in `matchesShape` and again before it's resolved.
- A document's URI is checked and normalized once by `resolveSchema`, even
  when browser already checked it. Skipping the check would take an entry
  point that isn't public, and `index.js` exports everything in
  `resolve.js`. It's once for each document.

## Kernels are data

A kernel's handles stay `string`s. A kernel is serialized and restored,
a restored one without a URI keeps relative handles, and `""` is a
placeholder handle while lowering. Optimizations name the copies they make
with a space (`static-dynamic-scope.js`), so no copy can be a location, and
a copy isn't an IRI-reference. A message names a handle with `handleName`
(`src/kernel/fast.js`), which says one that isn't an IRI-reference as it
is. A keyword's location isn't a handle: a copy keeps its keywords'
locations, so an output's `absoluteKeywordLocation` is always an
IRI-reference, and output formats give it to `relativeFileUrl` without a
check.

- Branding handles was rejected. The only brand that's true of every handle
  is an opaque one, which `@hyperjump/uri` doesn't take, and an
  `IriReference` brand wouldn't catch a lint site that doesn't normalize a
  `href`, because every `Iri` is an `IriReference`.
- A restored kernel's handles aren't checked. Only lowered locations are
  serialized, some made relative, because the copies are made when an
  evaluator is built from the kernel, not in it, so each one is an
  IRI-reference. `restore` trusts the rest of a serialized kernel's shape
  too, so a kernel that wasn't made by `serialize` evaluates wrongly
  rather than throwing.

## Known limitations

- A plain-name fragment in `$id` (draft-04 through draft-07) is the anchor
  as it's written. v1 read it from the resolved, normalized IRI, so
  `#%66oo` was the anchor `foo`. It isn't a valid anchor name either way.
- A relative URI isn't looked for in the registries, because the context
  URI it's resolved against is browser's. A schema in a registry can't have
  a `file:` URI, so it only matters in a web page.
