# Formats

`format` says what kind of string a value is, like `"email"` or
`"date-time"`. Whether it's checked depends on the dialect.

| Dialect | What format does |
| --- | --- |
| v1, draft-04 to draft-07 | Validates |
| 2019-09, 2020-12 | Only annotates. A value that isn't an email is still valid. |

The `validateFormats` config overrides the dialect, for every schema:

```typescript
const jsonSchema = new JsonSchema({ validateFormats: true });
```

A format only applies to values of its type. `"email"` only checks strings,
so `42` is valid against `{ "format": "email" }`. Use `type` to require a
string.

## Which formats there are

Each dialect comes with the formats its spec defines, except three:
`hostname`, `idn-hostname`, and `idn-email`. Checking them correctly takes
large tables of Unicode data, so they're only loaded if you ask for them.
draft-04 and draft-06 have a simpler `hostname` of their own, which is
always loaded.

```typescript
import { fullFormats } from "@hyperjump/json-schema/formats/full";

const jsonSchema = new JsonSchema({ dialects: [v1Dialect], formats: fullFormats });
```

| Dialect | Formats |
| --- | --- |
| v1, 2019-09, 2020-12 | `date-time`, `date`, `time`, `duration`, `email`, `idn-email`, `hostname`, `idn-hostname`, `ipv4`, `ipv6`, `uri`, `uri-reference`, `iri`, `iri-reference`, `uuid`, `uri-template`, `json-pointer`, `relative-json-pointer`, `regex` |
| draft-07 | The same, without `duration` and `uuid` |
| draft-06 | `date-time`, `email`, `hostname`, `ipv4`, `ipv6`, `uri`, `uri-reference`, `uri-template`, `json-pointer` |
| draft-04 | `date-time`, `email`, `hostname`, `ipv4`, `ipv6`, `uri` |

The [Hyperjump CLI](https://github.com/hyperjump-io/cli/blob/main/website/README.md)
loads every format.

## Formats that can't be checked

When formats are validated, `compile` throws if a schema uses a format that
can't be checked:

- One of the three formats above, without `fullFormats`.
- In v1, 2019-09, and 2020-12, a format the dialect doesn't define, like
  `"phone"`. A schema that asks for a check that can't be made would
  otherwise pass everything. draft-04 to draft-07 ignore formats they don't
  define.

To support a format of your own, see
[Custom formats](../extending/formats.md).
