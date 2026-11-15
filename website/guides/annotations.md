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

The tree is a [unist](https://github.com/syntax-tree/unist) tree. You can
use unist utilities like
[`unist-util-visit`](https://github.com/syntax-tree/unist-util-visit) to find
the nodes you need. Each node has a `jsonType`, a `location`, and
`children`.

With `input: "json"`, it does the same for JSON text, and the nodes have
positions. With `input: "node"`, it annotates a node you already have, and
`node` is the one you passed in. Like `validator`, it takes an
[`output`](output.md) option.

## Reading an annotation

Annotations are stored by keyword URI, because the same keyword can have
different names in different dialects. `annotation` looks them up by name,
in a session. By default it uses v1's names:

```typescript
import { annotation, JsonSchemaHyperjump } from "@hyperjump/json-schema";

const session = new JsonSchemaHyperjump(config);
annotation(session, node, "title"); // ["Person"]
```

It always returns a list. A node can have more than one value for a
keyword, one from each schema that applied to it. For example, two schemas
in an `allOf` might each have a `title`. A node without the annotation gets
an empty list.

For a schema in another dialect, pass the dialect URI too:

```typescript
const draft202012 = "https://json-schema.org/draft/2020-12/schema";
annotation(session, node, "title", draft202012);
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
