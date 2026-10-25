# `unknown-keyword`

In `recommended`, as a warning.

Names of unknown keywords that aren't reported, like `"x-internal"`

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
