# `non-canonical-dialect-uri`

In `recommended`, as a warning.

A `$schema` that other implementations might not recognize. That's one
that:

- Has a fragment that isn't empty.
- Isn't normalized, like `HTTP://json-schema.org/…`.
- Is for draft-04 through 2020-12 and doesn't match the URI its
  meta-schema uses. draft-04 through draft-07 use the empty fragment, like
  `http://json-schema.org/draft-07/schema#`. 2019-09 and 2020-12 don't.

This implementation recovers, but implementations that compare dialect
URIs as strings won't recognize the dialect. See
[Dialects](../../../design/components/dialects/README.md) for why.

In v1, a fragment or a URI that isn't normalized is invalid, so
`invalid-dialect-uri` also reports it as an error. It has no options.

## Examples

### Reported

#### draft-07 without the empty fragment

```json
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "type": "string"
}
```

> 'http://json-schema.org/draft-07/schema' should be 'http://json-schema.org/draft-07/schema#', the URI its meta-schema identifies itself with. Implementations that compare dialect URIs as strings won't recognize it.

#### draft-04 without the empty fragment

```json
{
  "$schema": "http://json-schema.org/draft-04/schema",
  "type": "string"
}
```

> 'http://json-schema.org/draft-04/schema' should be 'http://json-schema.org/draft-04/schema#', the URI its meta-schema identifies itself with. Implementations that compare dialect URIs as strings won't recognize it.

#### 2020-12 with an empty fragment

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema#",
  "type": "string"
}
```

> 'https://json-schema.org/draft/2020-12/schema#' should be 'https://json-schema.org/draft/2020-12/schema', the URI its meta-schema identifies itself with. Implementations that compare dialect URIs as strings won't recognize it.

### Not reported

#### draft-07 with the empty fragment

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string"
}
```

#### 2020-12 without a fragment

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string"
}
```
