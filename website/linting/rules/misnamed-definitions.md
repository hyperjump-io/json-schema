# `misnamed-definitions`

In `recommended`, as a warning.

`definitions` in a dialect where the keyword for definitions is `$defs`
(2019-09 and 2020-12). Or `$defs` in a dialect where it's `definitions`
(draft-04 through draft-07). It's an unknown keyword in that dialect, so
what's inside it isn't a schema. It isn't checked, and
`reference-without-target` reports references to it. The 2019-09 and
2020-12 meta-schemas still describe `definitions` so that older uses don't
conflict. Some implementations still treat it as a keyword, but the specs
don't.

The keyword for definitions is looked up by its URI in the schema's
dialect, so custom dialects are covered too. Dialects where unknown
keywords are errors, like v1, aren't reported, because the resolver
already reports them. It has no options.

## Examples

### Reported

#### Definitions in 2020-12

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "definitions": { "foo": { "type": "string" } }
}
```

> 'definitions' isn't a keyword in this dialect, so what's in it isn't a schema, and references to it don't find one. Use '$defs'.

#### $defs in draft-07

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$defs": { "foo": { "type": "string" } }
}
```

> '$defs' isn't a keyword in this dialect, so what's in it isn't a schema, and references to it don't find one. Use 'definitions'.

### Not reported

#### $defs in 2020-12

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": { "foo": { "type": "string" } }
}
```

#### Definitions in draft-07

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": { "foo": { "type": "string" } }
}
```
