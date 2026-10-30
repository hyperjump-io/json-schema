# Lint rules

A lint rule is a [unified](https://unifiedjs.com/) plugin that looks at a
schema AST and reports what it finds. Make one with `lintRule` from
`@hyperjump/json-schema/lint`.

## A first rule

This rule reports a `minimum` without a `maximum`:

```typescript
import {
  lintRule,
  siblingKeyword,
  visitKeywords
} from "@hyperjump/json-schema/lint";

const minimum = "https://json-schema.org/keyword/minimum";
const maximum = "https://json-schema.org/keyword/maximum";

export default lintRule({
  origin: "my-rules:min-without-max",
  url: "https://example.com/rules/min-without-max"
}, (tree, file) => {
  visitKeywords(tree, minimum, (keywordNode, schemaNode) => {
    if (siblingKeyword(schemaNode, maximum) === undefined) {
      file.message("'minimum' without 'maximum'", {
        place: keywordNode.position
      });
    }
  });
});
```

- `origin` is the rule's source and name in the form `source:name`. You use
  the name to turn the rule off in a
  [configuration comment](../linting/configuration-comments.md).
- `url` is a page about the rule. It's added to every message the rule
  reports.
- The function gets the schema AST, which is a `JsonSchemaDocumentNode`,
  and the file. It reports with `file.message` and the position of the node
  the message is about.

`lintRule` is
[`unified-lint-rule`](https://github.com/remarkjs/remark-lint/tree/main/packages/unified-lint-rule)'s,
so the rule takes a severity and options like any other rule. `lintRule`
also applies configuration comments to the rule's messages.

Use it like a built-in rule:

```typescript
import minWithoutMax from "./min-without-max.js";

const results = await lint(jsonSchema, uri, {
  plugins: [recommended, [minWithoutMax, ["warn"]]]
});
```

## Finding keywords

A rule runs after every schema and keyword in the document has been
identified. Find keywords by URI, not by name. That way the rule works in
every dialect that has the keyword, whatever its name is there.

`@hyperjump/json-schema/lint` has utilities to find what a rule needs. For
example, `visitKeywords` visits every keyword with a given URI.
`siblingKeyword` finds another keyword in the same schema. See
[`src/lint/index.d.ts`](https://github.com/hyperjump-io/json-schema/blob/v2/src/lint/index.d.ts)
for the others. The built-in rules in
[`src/lint/rules/`](https://github.com/hyperjump-io/json-schema/tree/v2/src/lint/rules)
show how they're used.

## Looking at other schemas

A rule that needs another schema, such as the target of a `$ref`, finds it
with `findSchema`. Use the session the schema was resolved in, which is
`file.data.jsonSchemaSession`. That way the rule only sees what your
application's registry and `allowRetrieval` allow. The session is
`undefined` when the schema couldn't be resolved, and then there's nothing
to look at. Pass the tree as `document` so that references into the schema
being linted find what's in it.

```typescript
import type { JsonSchemaNode } from "@hyperjump/json-schema";
import { findSchema, visitReferences } from "@hyperjump/json-schema/lint";

const session = file.data.jsonSchemaSession;
if (session === undefined) {
  return;
}

const references: [string, JsonSchemaNode][] = [];
visitReferences(tree, (uri, node) => references.push([uri, node]));
for (const [uri, node] of references) {
  const result = await findSchema(session, uri, { document: tree });
  if (result.status === "missing") {
    file.message(result.reason.message, { place: node.position });
  }
}
```

`visitReferences` finds every `$ref` in every dialect along with the URI it
refers to. `findSchema` says whether the schema is `found`, `missing`, or
`unknown`. Only report `missing`. `unknown` means there's no way to tell,
for example for a URL that `allowRetrieval` doesn't allow.

## Schemas that apply together

`schemaGroup` finds every schema that can apply to the same value as a
given schema. Those are the schemas connected to it, in either direction,
by keywords like `allOf`, `anyOf`, and `if`, or by references. A rule uses
it to look beyond the schema a keyword is in. For example, it can find the
`properties` next to the `anyOf` that contains a `required`.

```typescript
const session = file.data.jsonSchemaSession;
const group = await schemaGroup(session, tree, schemaNode);
```

Which keywords connect schemas is worked out from what they lower to, so
custom keywords count too. The group's `links` say how schemas are
connected. That matters because schemas in an `anyOf` can apply without
all of them having to pass. The links also say whether a schema is applied
through `not` or as a condition, like `if`. `open` means a schema in the
group could be referenced from another document. `unknown` means a
reference couldn't be followed.

## What keywords mean

Some rules need to know what a keyword does, not just where it is. Those
rules read what the keyword lowers to. That way they support every keyword
that lowers, including custom ones.

- `lowerForLint` lowers every schema in the document without compiling or
  retrieving anything. It gives each keyword's group along with its node
  and the nodes of the siblings it read.
- `keywordAppliesTo` says which types of value a keyword applies to.
- `assertsOnItsOwn` says whether a keyword can fail without applying a
  schema.
- `formatTypes` says which types of value a `format` keyword's format
  applies to. It returns `undefined` if the format could apply to any
  type.

```typescript
const session = file.data.jsonSchemaSession;
const schemas = await lowerForLint(session, tree);
for (const keywords of schemas.values()) {
  for (const { keywordNode } of keywords) {
    const { jsonSchema } = session;
    const types = keywordAppliesTo(jsonSchema, keywords, keywordNode);
    if (types.length === 0) {
      file.message("This keyword has no effect", {
        place: keywordNode.position
      });
    }
  }
}
```

## Evaluating values

`evaluatorForLint` evaluates the document's schemas against values in the
document, like a `default`, without compiling. A value passes, fails, or is
unknown. It's unknown when whatever decides it can't be known, like a
reference that can't be followed or a `$dynamicRef`. Then `valid` is
`undefined`. It also says whether a schema or keyword might annotate the
value or mark part of it as evaluated.

```typescript
const evaluator = await evaluatorForLint(file.data.jsonSchemaSession, tree);
if (evaluator.schema(schemaNode, defaultNode.children[1]).valid === false) {
  file.message("The default isn't valid", { place: defaultNode.position });
}
```

## Publishing rules

A package named `hyperjump-<name>` can be listed in the CLI's
`.hyperjumprc` as just `<name>`. A package can export a preset, which is a
list of rules with their settings. `@hyperjump/json-schema/lint/recommended`
is an example.
