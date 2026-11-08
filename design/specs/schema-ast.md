# Schema AST (`src/schema/schema-ast.d.ts`)

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
  that contains it, not the document. A resource's URI, a `location`, and
  a `href` are normalized, so a `href` is the same string as the `location`
  it finds (see [Identifiers](../components/identifiers.md)).
- Embedded resources stay in the tree. Each resource gets a
  `JsonSchemaDocumentNode` whose root is the same node object. Every resource
  in a document shares one `embedded` map that includes all of them,
  including the root.
- Only a reference from the same document (`referencedFrom`) finds an
  embedded resource, so `compile` can't start from one. `JsonSchemaSession`
  overrides browser's `getDocument` to do that, and browser knows nothing
  about embedding. An embedded resource takes precedence over a cached
  document with the same URI.
- A URI identifies one resource in a session. Two documents with a resource
  identified by the same URI, embedded or not, are an error when the second
  is loaded, unless the resources have the same dialect and the same JSON
  apart from `$schema`. It's a `SchemaError` in the second document, with
  the same `duplicate-id` rule as two resources with the same URI in one
  document. That allows a bundle in the same session as the
  schemas it includes, which leaves `$schema` off a resource in the same
  dialect. A reference from a resource that's in more than one document
  finds what they embed only if every one of them embeds it. Otherwise, it's
  found the usual way too, which has to find an identical resource.
  Rejected: references finding the resources alongside it in whichever
  document was loaded first, which was the rule until 2026-10-29. A
  document loaded first could embed a resource with the URI of one embedded
  in a trusted schema, and change what references from it found, for the
  rest of the session. The kernel identifies schemas by location too, so
  two different resources with the same URI can't be compiled together
  either way.
- Anchors and dynamic anchors are recorded per resource as JSON Pointers.
  2019-09's `$recursiveAnchor: true` is a dynamic anchor named `""`. The
  schema media type plugin's `fragmentPointer` looks anchors up, so browser
  doesn't know about them either. Every resource's `mediaType` is
  `application/schema+json`, so that works for embedded resources browser
  didn't parse.
- A fragment that isn't a JSON Pointer is an anchor. If the resource
  doesn't have it, `fragmentPointer` throws an `AnchorNotFoundError`, so it
  never reaches browser as a pointer that isn't valid.
