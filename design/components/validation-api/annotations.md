# Annotations

- `annotate` returns `{ output, status, node }`. Annotations are
  `node.data.annotations`, a `Map` of annotation keyword URI to values.
- Annotations are read with `annotation(node, keyword, dialectUri)` on
  `JsonSchemaSession`, like the other AST operations, as in v1. The keyword
  is a keyword URI if a keyword with that URI is defined (without the
  fragment, for unknown keywords), so a URI doesn't need the dialect.
  Otherwise it's a name in the dialect (v1 by default), and a name that
  isn't in the dialect is an unknown keyword. The dialect is looked up
  synchronously, so one built from a meta-schema has to have been built in
  that session. There's no `annotatedWith` like v1's. The AST is a unist
  tree, so unist utilities can find annotated nodes. Annotations don't
  record the schema location they came from. The new output format spec's
  flat list of annotations would.
- Annotations stay plain data on each node, attached when evaluation
  ends, so they work with the rest of the unified ecosystem. Attaching is
  most of what annotating costs beyond evaluating (about 0.21 ms of
  tsconfig's 3,433 annotations, against 0.07 ms to record them), but
  these were rejected, because annotations wouldn't be on the nodes
  anymore, or only after `annotation` reads them:
  - Keeping the flat list of node and annotation id as the result, with
    an index built when a node is first asked about.
  - Attaching an array of ids to each node and turning it into the `Map`
    when `annotation` first reads it.
- In a broken (error-tolerant) tree, keywords skip `json-missing` and
  `json-invalid` nodes, and `required` counts a property with a missing value
  as present, so the syntax error is the only error for it.
- Extra information for the language server (schema locations, evaluated
  branches, annotations from failing schemas) comes from evaluation
  plugins.

## Open questions

- **Annotations for invalid instances.** The spec drops annotations from
  failing schemas, which leaves the language server without them. Plugins
  see every annotation (the `annotation` hook), so the language server can
  have them. Whether `annotate` itself should offer another behavior is
  still open.
