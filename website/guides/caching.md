# Caching compiled schemas

Compiling retrieves and checks every schema, which takes time when your
application starts or when a schema is on a slow server. A compiled schema
can be saved as JSON and restored later, without retrieving or compiling
anything.

```typescript
const validator = await jsonSchema.compile("https://example.com/person");
const compiled = validator.serialize();
await writeFile("./person.compiled.json", JSON.stringify(compiled));
```

```typescript
const text = await readFile("./person.compiled.json", "utf8");
const compiled = JSON.parse(text);
const validator = jsonSchema.restoreValidator(compiled);

validator.validate({ name: "Jason" }); // true
```

`restoreValidator` is synchronous, and the validator works like a compiled
one.

The `JsonSchema` that restores it needs the same keywords and formats as the
one that compiled it. That's usually the same dialects, plus any
[custom keywords](../extending/keywords.md) or
[formats](../extending/formats.md) you added. It throws if one is missing.
It also throws for a schema compiled by a version of the library with a
different compiled format, so compile again after upgrading.

A compiled schema doesn't change when its source schemas do. Compile again
when they change, such as in your build.

## Schemas in files

A schema in a file is saved with its `file:` URLs relative to it, so the
compiled schema doesn't say where your files are, and you can restore it on
another machine. Tell `restoreValidator` where the schema is now, so the
locations in errors are its files:

```typescript
import { pathToFileURL } from "node:url";

const validator = jsonSchema.restoreValidator(compiled, {
  uri: pathToFileURL("./schemas/person.schema.json").href
});
```

Its other files need to be laid out the same way relative to it. Without
`uri`, the validator works the same, and its locations are relative, like
`#/properties/name`.
