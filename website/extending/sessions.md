# Sessions

A session retrieves, browses, and compiles schemas. Everything it finds
belongs to it: the documents it retrieves and the dialects it builds from
meta-schemas. It's thrown away with the session.

`compile`, `bundle`, and `lint` on a `JsonSchema` each start a new session.
Start one yourself to:

- **Compile several schemas with the same documents.** Each is retrieved and
  checked once for the session, instead of once per compilation.
- **Browse schemas** with the
  [`@hyperjump/browser`](https://github.com/hyperjump-io/browser/blob/v2/website/README.md)
  API, following references.
- **Read annotations** by keyword name, with `annotation` (see
  [Annotations](../guides/annotations.md#reading-an-annotation)).

```javascript
const session = jsonSchema.session({ registries: [registry] });

const person = await session.compile("https://example.com/person");
const address = await session.compile("https://example.com/address");

const name = await session.get("https://example.com/person#/properties/name");
```

A session takes the same `registries` and `allowRetrieval` options as
`compile`. A validator doesn't need its session after it's compiled.

A session sees documents as they were when it first retrieved them, so
start a new one to see changes. Responses from HTTP are cached across
sessions by their caching headers.
