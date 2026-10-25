# Lint rules

A lint rule is a unified plugin made with `lintRule` from
`@hyperjump/json-schema/lint`. It's
[`unified-lint-rule`](https://github.com/remarkjs/remark-lint/tree/main/packages/unified-lint-rule)'s
`lintRule`, and it also applies `$comment` directives to the rule's messages.
A `url` next to `origin` is put on every message, for a page about the rule.
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
`if`, and by references, in either direction. Which keywords those are is
found from what they lower to, so a custom keyword counts too. A rule uses
it to look past the schema a keyword is in, such as to find `properties`
next to the `anyOf` a `required` is in. Its `links` say how they're
connected, because schemas in an `anyOf` can apply without all having to
pass, and say whether a schema is applied through `not` or as a condition,
like `if`. `open` means a schema in it could be referenced from another
document, and `unknown` means a reference couldn't be followed.

```javascript
const group = await schemaGroup(file.data.jsonSchemaSession, tree, schemaNode);
```

`formatTypes` says which types of value a `format` keyword's format applies
to, from the format's definition, or undefined if it could apply to any.

A rule that needs to know what a keyword means, rather than where it is,
reads what it lowers to. `lowerForLint` lowers every schema in the document
without compiling or retrieving anything, and gives each keyword's group
with its node and the nodes of the siblings it read. `keywordAppliesTo` says
which types of value a keyword applies to, and `assertsOnItsOwn` whether it
can fail without applying a schema, so a rule supports any keyword that
lowers, including custom ones.

```javascript
const session = file.data.jsonSchemaSession;
const schemas = await lowerForLint(session, tree);
for (const keywords of schemas.values()) {
  for (const { keywordNode } of keywords) {
    if (keywordAppliesTo(session.jsonSchema, keywords, keywordNode).length === 0) {
      file.message("This keyword has no effect", { place: keywordNode.position });
    }
  }
}
```

`evaluatorForLint` evaluates the document's schemas on values in it, like a
`default`, without compiling, from what they lower to. A value passes,
fails, or is unknown (`valid` is undefined), when what decides it isn't
known, like a reference that can't be followed or a `$dynamicRef`. It also
says whether a schema or a keyword might annotate the value or mark part of
it as evaluated.

```javascript
const evaluator = await evaluatorForLint(file.data.jsonSchemaSession, tree);
if (evaluator.schema(schemaNode, defaultNode.children[1]).valid === false) {
  file.message("The default isn't valid", { place: defaultNode.position });
}
```

A package named `hyperjump-<name>` can be used in `hjlint`'s `.hyperjumprc`
as `<name>`. See `src/lint/` for the built-in rules.
