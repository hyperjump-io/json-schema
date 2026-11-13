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
- Only a reference from the same document finds an embedded resource, so
  `compile` can't start from one. Browser finds it, in the `embedded` of
  the document the reference is in. A reference is followed from its node
  (`referencedFrom`), and browser finds the document a node is in from the
  node's location: among the documents the session has and the ones they
  contain, the one where the location's pointer leads to that node. So a
  resource's nodes keep their canonical URIs, and a document can't change
  what a reference in another document finds.
- A URI identifies one resource in a session. Two documents can only have
  a resource with the same URI if it's identical in both, like a schema
  and a bundle that includes it, which is checked when a document's
  resources are added to the session's. The kernel identifies schemas by
  location, so two different resources with the same URI can't be compiled
  together. The session's resources, by URI, are also how a node's
  resource is found (`resourceOf`), for what a resource has beyond its
  values, like its dynamic anchors.
- Anchors and dynamic anchors are recorded per resource as JSON Pointers.
  2019-09's `$recursiveAnchor: true` is a dynamic anchor named `""`. The
  schema media type plugins' `fragmentPointer` looks anchors up, so browser
  doesn't know about them either. An embedded resource has the plugin that
  parsed the document it's in, so that works for a resource browser didn't
  parse.
- A fragment that isn't a JSON Pointer is an anchor. If the resource
  doesn't have it, `fragmentPointer` throws an error whose `cause.code` is
  `ERR_ANCHOR_NOT_FOUND`, so it never reaches browser as a pointer that
  isn't valid.
