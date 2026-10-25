# Dialects

A `JsonSchema` starts without any dialects. Add the ones you need from their
modules. Presets don't depend on each other, so add only what you use.

```javascript
import { addDraft202012 } from "@hyperjump/json-schema/draft-2020-12";
import { addDraft07 } from "@hyperjump/json-schema/draft-07";

addDraft202012(jsonSchema);
addDraft07(jsonSchema);
```

| Module | Add with | Dialect URI |
| --- | --- | --- |
| `@hyperjump/json-schema/v1` | `addV1` | `https://json-schema.org/v1` |
| `@hyperjump/json-schema/draft-2020-12` | `addDraft202012` | `https://json-schema.org/draft/2020-12/schema` |
| `@hyperjump/json-schema/draft-2019-09` | `addDraft201909` | `https://json-schema.org/draft/2019-09/schema` |
| `@hyperjump/json-schema/draft-07` | `addDraft07` | `http://json-schema.org/draft-07/schema` |
| `@hyperjump/json-schema/draft-06` | `addDraft06` | `http://json-schema.org/draft-06/schema` |
| `@hyperjump/json-schema/draft-04` | `addDraft04` | `http://json-schema.org/draft-04/schema` |

A schema's dialect comes from `$schema`. There's no default. A schema without
one is an error unless it's embedded in a schema that has one, or you set one.

```javascript
const jsonSchema = new JsonSchema({ defaultDialectUri: "https://json-schema.org/v1" });
```

Custom meta-schemas that use `$vocabulary` (2019-09 and 2020-12) define their
own dialects. Use `addVocabulary` from either of those modules to add
vocabularies they can use.

Unknown keywords are errors in v1, except ones that start with `x-`, which
are annotations. They're annotations in 2019-09 and 2020-12, and ignored in
draft-04 through draft-07.
