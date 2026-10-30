# `unknown-keyword`

In `recommended`, as a warning.

A property of a schema that isn't a keyword in its dialect. It's usually a
misspelling. When a keyword's name is close, the message suggests it.

In 2019-09 and 2020-12, an unknown keyword is an annotation. In draft-04
through draft-07 it's ignored. Either way, a misspelled keyword silently
does nothing. In v1 and other dialects where unknown keywords are errors,
the resolver already reports them, so this rule doesn't.

These aren't reported:

- `$comment`, in dialects that don't have it
- `definitions` or `$defs` in a dialect that uses the other one.
  `misnamed-definitions` reports those.
- A property next to `$ref` in draft-04 through draft-07.
  `ignored-ref-siblings` reports those.

It has one option. `ignore` lists names of unknown keywords not to report,
like `"x-internal"`.

## Examples

### Reported

#### A misspelled keyword

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properites": {}
}
```

> 'properites' isn't a keyword in this dialect. Did you mean 'properties'?

#### Nothing close

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "x-internal": true
}
```

> 'x-internal' isn't a keyword in this dialect

#### In a subschema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "foo": { "tpye": "string" } }
}
```

> 'tpye' isn't a keyword in this dialect. Did you mean 'type'?

### Not reported

#### v1, where the resolver reports them

```json
{ "$schema": "https://json-schema.org/v1", "x-internal": true }
```

#### A draft-07 reference's siblings

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "properties": { "a": { "$ref": "#", "foo": 1 } }
}
```
