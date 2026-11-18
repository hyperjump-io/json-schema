# Annotations

Some keywords don't validate anything. Instead, they describe the value.
Examples are `title`, `description`, `default`, `examples`, `deprecated`,
and `readOnly`. Their values are annotations. A form generator can use them
for labels and default values. An editor can show a `description` on
hover.

An annotation belongs to part of a value. In this schema, `"Name"` is the
`title` of the `name` property, not of the whole object.

```json
{
  "$schema": "https://json-schema.org/v1",
  "$id": "https://example.com/person",
  "title": "Person",
  "type": "object",
  "properties": {
    "name": { "title": "Name", "type": "string" }
  }
}
```

## Getting annotations

`annotate` validates a value and returns it as a JSON AST. That's a tree of
nodes with each node's annotations attached to it.

```typescript
const annotatePerson = await annotator(config, "https://example.com/person");
const { output, node } = annotatePerson({ name: "Jason" });

output; // true
node.data.annotations;
// Map { "https://json-schema.org/keyword/title" => ["Person"] }
```

Each part of the value has its own node, with its own annotations. See
[Finding a node](#finding-a-node) for how to get to the one you want.

With `input: "json"`, it does the same for JSON text, and the nodes have
positions. With `input: "node"`, it annotates a node you already have, and
`node` is the one you passed in, or the root of a document you passed in. Like `validator`, it takes an
[`output`](output.md) option.

## Reading an annotation

Annotations are stored by keyword URI, because the same keyword can have
different names in different dialects. `annotation` looks them up by name
in the dialects of the config's JSON Schema media types. By default it uses
v1's names, so it needs v1 in the config:

```typescript
import { annotation } from "@hyperjump/json-schema";

annotation(config, node, "title"); // ["Person"]
```

It always returns a list. A node can have more than one value for a
keyword, one from each schema that applied to it. For example, two schemas
in an `allOf` might each have a `title`. A node without the annotation gets
an empty list.

Most annotation keywords, like `title` and `description`, are the same
keyword in every dialect, so one dialect's names find them in a schema of
any dialect. A few names mean a different keyword in another dialect.
`format` in draft-04 through draft-07 isn't v1's `format`, so for a
draft-07 schema, pass the dialect's URI too:

```typescript
const draft07 = "http://json-schema.org/draft-07/schema#";
annotation(config, node, "format", draft07); // ["email"]
annotation(config, node, "format"); // [], because it's v1's format
```

Pass a dialect's URI too if the config doesn't have v1, even for `title`.

The dialect has to be one you gave `jsonSchemaConfig`, so it can't be
one a [custom meta-schema](dialects.md#custom-meta-schemas) defines. For a
schema in that dialect, pass the dialect its meta-schema is built on, like
2020-12, whose names it shares. For a keyword from your own vocabulary,
which no dialect you gave has, use the keyword's URI, which doesn't need a
dialect:

```typescript
annotation(config, node, "https://example.com/keyword/units"); // ["kg"]
```

## Finding a node

`node` is the whole value. The `title` of the `name` property is on the
node for `name`, so get to that node first. The tree is a JSON AST from
[`@hyperjump/browser`](https://github.com/hyperjump-io/browser/blob/v2/website/parsing.md),
so its functions read it. `jsonPointerGet` takes a JSON Pointer, and
`jsonStep` takes one property name or array index:

```typescript
import { jsonPointerGet, jsonStep } from "@hyperjump/browser";

annotation(config, jsonPointerGet("/name", node), "title"); // ["Name"]
annotation(config, jsonStep("name", node), "title"); // ["Name"]
```

`jsonObjectEntries` and `jsonArrayIter` go through an object's properties
and an array's items.

To check every node, walk the tree. It's a
[unist](https://github.com/syntax-tree/unist) tree, so unist utilities like
[`unist-util-visit`](https://github.com/syntax-tree/unist-util-visit) work
on it. Its nodes have the type `"json"`. With `input: "json"`, each node has
its position in the text, so you can say where something is. This finds the
values a schema says are deprecated:

```typescript
import { visit } from "unist-util-visit";

const annotatePerson = await annotator(config, "https://example.com/person", { input: "json" });
const { node } = annotatePerson(text);

visit(node, "json", (valueNode) => {
  if (annotation(config, valueNode, "deprecated").includes(true)) {
    console.log(`Line ${valueNode.position.start.line} is deprecated`);
  }
});
```

## Which annotations are kept

Annotations follow the spec. Only schemas that a value passes can annotate
it. An `anyOf` schema that fails doesn't contribute anything. Neither does
the `else` of an `if` that passed.

Some unknown keywords are annotations, like `x-` keywords in v1. They're
stored under `https://json-schema.org/keyword/unknown#` followed by their
name. For example, `https://json-schema.org/keyword/unknown#x-internal`.

To also see annotations from schemas that fail, use an
[evaluation plugin](../extending/plugins.md). This is useful for showing a
`description` in a document that has errors.
