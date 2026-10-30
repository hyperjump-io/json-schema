# Caching compiled schemas

Compiling retrieves and checks every schema, which takes time when your
application starts or when a schema is on a slow server. A compiled schema
can be saved as JSON and restored later, without retrieving or compiling
anything.

```typescript
import { compile, serialize } from "@hyperjump/json-schema";

const person = await compile(jsonSchema, "https://example.com/person");
await writeFile("./person.compiled.json", JSON.stringify(serialize(person)));
```

```typescript
import { restore, validatorFor } from "@hyperjump/json-schema";

const text = await readFile("./person.compiled.json", "utf8");
const person = restore(jsonSchema, JSON.parse(text));
const isPerson = validatorFor(person);

isPerson({ name: "Jason" }); // true
```

`restore` is synchronous, and the compiled schema it returns works like one
from `compile`. Make functions from it with `validatorFor` and
`annotatorFor`, which take the same options as `validator` and
`annotator`.

The `JsonSchema` that restores it needs the same keywords and formats as the
one that compiled it. That's usually the same dialects, plus any
[custom keywords](../extending/keywords.md) or
[formats](../extending/formats.md) you added. It throws if one is missing.
It also throws for a schema compiled by a version of the library with a
different compiled format, so compile again after upgrading.

A compiled schema doesn't change when its source schemas do. Compile again
when they change, such as in your build.

Nothing else is cached between calls. `validate(jsonSchema, uri, value)`
compiles every time, and so does a schema given as a value, so code that
validates many values makes a `validator` once.

## Schemas in files

A schema in a file is saved with its `file:` URLs relative to it, so the
compiled schema doesn't say where your files are, and you can restore it on
another machine. Tell `restore` where the schema is now, so the
locations in errors are its files:

```typescript
import { pathToFileURL } from "node:url";

const person = restore(jsonSchema, JSON.parse(text), {
  uri: pathToFileURL("./schemas/person.schema.json").href
});
```

Its other files need to be laid out the same way relative to it. Without
`uri`, it works the same, and its locations are relative, like
`#/properties/name`.
