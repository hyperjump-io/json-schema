# Formats

`format` says what kind of string a value is, like `"email"` or
`"date-time"`. Whether it's checked depends on the dialect.

| Dialect | What format does |
| --- | --- |
| v1, draft-04 to draft-07 | Validates |
| 2019-09, 2020-12 | Only annotates. A value that isn't an email is still valid. |

The `validateFormats` option of `jsonSchemaConfig` overrides the dialect
for every schema:

```typescript
const config = jsonSchemaConfig({
  dialects: [draft202012Dialect],
  validateFormats: true
});
```

A format only applies to values of its type. `"email"` only checks strings,
so `42` is valid against `{ "format": "email" }`. Use `type` to require a
string.

## Which formats there are

Each dialect comes with the formats its spec defines, with a few
exceptions: `idn-hostname`, `idn-email`, and, in draft-07 through 2020-12,
`hostname`. Checking them correctly takes large tables of Unicode data, so
they're only loaded if you ask for them. v1, draft-04, and draft-06 have a
simpler `hostname` that doesn't check internationalized labels. It's always
loaded.

In v1, `date-time` allows the time zone and tag suffixes of RFC 9557, like
`"2022-07-08T00:14:07Z[Europe/London]"`. The other dialects only allow RFC
3339 date-times.

```typescript
import { fullFormats } from "@hyperjump/json-schema/formats/full";

const config = jsonSchemaConfig({
  dialects: [v1Dialect],
  formats: fullFormats
});
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

- One of the three formats above when `fullFormats` isn't loaded.
- In v1, 2019-09, and 2020-12, a format the dialect doesn't define, like
  `"phone"`. Otherwise a schema that asks for a check that can't be made
  would pass everything. draft-04 to draft-07 ignore formats they don't
  define.

To support a format of your own, see
[Custom formats](../extending/formats.md).
