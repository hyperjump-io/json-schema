# Sessions

A session retrieves, browses, and compiles schemas. Everything it resolves
belongs to it, and it goes away with the session. `compile` creates a session
for each compilation. Create one yourself to browse schemas with
`@hyperjump/browser`'s API or to compile several schemas with the same
documents.

```javascript
const session = jsonSchema.session({ registries: [registry] });
const node = await session.get("https://example.com/person#/properties/name");
const validator = await session.compile("https://example.com/person");
```
