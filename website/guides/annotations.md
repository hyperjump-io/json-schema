# Annotations

Some keywords don't validate anything. They describe the value instead:
`title`, `description`, `default`, `examples`, `deprecated`, `readOnly`, and
others. Their values are annotations. A form generator can use them for
labels and default values, and an editor can show a `description` on hover.

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

`annotate` validates a value and returns it as a JSON AST, a tree of nodes,
with each node's annotations attached to it.

```javascript
const { output, node } = validator.annotate({ name: "Jason" });

output; // true
node.data.annotations;
// Map { "https://json-schema.org/keyword/title" => ["Person"] }
```

The tree is a [unist](https://github.com/syntax-tree/unist) tree, so you
can use unist utilities like
[`unist-util-visit`](https://github.com/syntax-tree/unist-util-visit) to find
the nodes you need. Each node has a `jsonType`, its `location`, and its
`children`.

`annotateJson` does the same for JSON text, and the nodes have positions.
`annotateNode` annotates a node you already have, and returns only the
output. Like the validation methods, they take an
[`output`](output.md) option.

## Reading an annotation

Annotations are kept by keyword URI, because the same keyword can have
different names in different dialects. A session's `annotation` method finds
them by name, in v1 by default:

```javascript
const session = jsonSchema.session();
session.annotation(node, "title"); // ["Person"]
```

It's always a list. A node can have more than one value for a keyword, one
for every schema that applied to it, like two schemas in an `allOf` that
each have a `title`. A node without the annotation gets an empty list.

For a schema in another dialect, pass the dialect URI too:

```javascript
const draft202012 = "https://json-schema.org/draft/2020-12/schema";
session.annotation(node, "title", draft202012);
```

## Which annotations are kept

Annotations follow the spec. Only the schemas a value passes annotate it. An
`anyOf` schema that fails, or the `else` of an `if` that passed, doesn't
contribute anything.

Unknown keywords that are annotations, like `x-` keywords in v1, are kept
under `https://json-schema.org/keyword/unknown#` followed by their name,
like `https://json-schema.org/keyword/unknown#x-internal`.

To see annotations from schemas that fail too, such as to show a
`description` in a document that has errors, use an
[evaluation plugin](../extending/plugins.md).
