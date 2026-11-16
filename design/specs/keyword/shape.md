# `shape`

Where the value contains schemas, using combinators: `"schema"`,
`"unappliedSchema"`, `"reference"`, `"data"`, `{ array: Shape }`,
`{ map: Shape }`, or `Shape[]` (the first alternative whose JSON type
matches).

- **`shape` is the input type of `lower`.** The kernel parses the value by
  its shape, reports values that don't fit, and gives `lower` the value
  with schemas replaced by expressions (`apply` of the handle they'll
  compile to) and references resolved. So `lower` never looks for schemas,
  and `shape` can't disagree with what the keyword does.
- **The shape owns the JSON types** of what it describes, and the resolver
  reports a value that doesn't fit. A value where the shape says
  `"schema"` is a schema node even if it isn't an object or boolean
  (`invalid-schema`). Only alternatives are chosen by the value. A value
  that matches none of them, or a map or array that's the wrong type, is
  reported with the keyword's URI as the `ruleId` and is data.
- **`"data"`** matches anything, so as an alternative it hands the rest to
  the keyword's check. Only `itemPattern` uses one, because its operators
  are strings, which a shape can't describe.
- **`"reference"`** is a URI reference to a schema, resolved against the
  base URI (`$ref`, 2020-12's `$dynamicRef`, `$recursiveRef`). The resolver
  makes its node a `reference` node with the URI it resolves to as `href`,
  like a schema that's a reference, so browser follows it, and lint and
  bundling find references by the AST, without knowing keywords. A reference's input to `lower` is
  `{ uri: string; schema: Expression; handle: Handle; dynamicAnchors: Record<string, Handle> | undefined }`:
  `$dynamicRef` reads its fragment, and the dynamic anchors of the resource
  it resolved to are what `$dynamicRef` and `$recursiveRef` decide with.
  They're undefined when lint doesn't know them (see
  [Lowering for lint](../kernel/lowering-for-lint.md)).
- **`"unappliedSchema"`** is a schema that the keyword doesn't apply
  (`contentSchema`). It's resolved like any schema, so identifiers in it
  are found, and lint and the language server know it's a schema, but it
  isn't compiled, and `lower` gets its JSON.
