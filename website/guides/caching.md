# Caching compiled schemas

Compiling retrieves and checks every schema. That takes time when your
application starts, especially when a schema is on a slow server. You can
save a compiled schema as JSON and restore it later without retrieving or
compiling anything.

```typescript
import { compile, serialize } from "@hyperjump/json-schema";

const person = await compile(config, "https://example.com/person");
await writeFile("./person.compiled.json", JSON.stringify(serialize(person)));
```

```typescript
import { restore, validatorFor } from "@hyperjump/json-schema";

const text = await readFile("./person.compiled.json", "utf8");
const person = restore(config, JSON.parse(text));
const isPerson = validatorFor(person);

isPerson({ name: "Jason" }); // true
```

`restore` is synchronous. The compiled schema it returns works like one from
`compile`. Make functions from it with `validatorFor` and `annotatorFor`.
They take the same options as `validator` and `annotator`.

The config that restores it needs the same keywords and formats as the one
that compiled it. That usually means the same dialects plus any
[custom keywords](../extending/keywords.md) or
[formats](../extending/formats.md) you added. `restore` throws if one is
missing. It also throws if the schema was compiled by a library version
with a different compiled format, so compile again after upgrading.

A compiled schema doesn't change when its source schemas do. Compile again
when they change, for example in your build.

Nothing else is cached between calls. `validate(config, uri, value)`
compiles every time, and so does a schema given as a value. Code that
validates many values should make a `validator` once. A remote schema is
also retrieved again each time, unless the config shares an HTTP cache. See
[Retrieving less](retrieval.md#retrieving-less).

## Schemas in files

A schema in a file is saved with its `file:` URLs relative to the file.
That way the compiled schema doesn't reveal where your files are, and you
can restore it on another machine. Tell `restore` where the schema is now
so that the locations in errors point to its files:

```typescript
import { pathToFileURL } from "node:url";

const person = restore(config, JSON.parse(text), {
  uri: pathToFileURL("./schemas/person.schema.json").href
});
```

Its other files need to be laid out the same way relative to it. Without
`uri` it works the same, but its locations are relative, like
`#/properties/name`.
